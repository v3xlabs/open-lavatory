import { SignalConnectionLostError } from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";

import type { CreateSignalLayerFn, SignalingBaseCallbacks } from "../base.js";
import { createSignalingLayer } from "../index.js";
import { log } from "../utils/log.js";
import { parseNtfyUrl } from "./url.js";

export type NtfyMessage = {
  // eslint-disable-next-line no-restricted-syntax
  id: string;
  time: number;
  expires: number;
  event: string;
  topic: string;
  message: string;
};

/**
 * Ntfy Signaling Layer
 *
 * Uses HTTP POST for publishing
 * Uses SSE (EventSource) for subscribing
 *
 * URL format supports the ?auth= parameter
 * example: https://ntfy.sh/mytopic?auth=mytoken
 *
 * The same goes for apprise ntfy urls
 * example: ntfy://{token}@{hostname}/{topic}
 * example: ntfy://{user}:{password}@{hostname}/{topic}
 * https variant: ntfys://{user}:{password}@{hostname}/{topic}
 *
 * https://openlv.sh/api/signaling/ntfy
 */

const NTFY_MAX_RETRIES = 5;
const NTFY_PING_INTERVAL_MS = 2000;
const NTFY_PING_TIMEOUT_MS = 1500;
const NTFY_RETRY_INITIAL_DELAY_MS = 1000;
const NTFY_RETRY_MAX_DELAY_MS = 30_000;

export const ntfy: CreateSignalLayerFn = ({ topic, url }) => {
  const connectionInfo = parseNtfyUrl(url);
  const events = new EventEmitter<{ message: string; }>();
  const sseUrl = `${connectionInfo.protocol}://${connectionInfo.host}/${topic}/sse${connectionInfo.parameters ?? ""}`;
  const pingUrl = `${connectionInfo.protocol}://${connectionInfo.host}/`;

  let source: EventSource | undefined;
  let ac: AbortController | undefined;
  let intentionalClose = false;
  let retryAttempt = 0;
  let setupResolve: (() => void) | undefined;
  let setupReject: ((err: Error) => void) | undefined;

  const timers = {
    ping: undefined as ReturnType<typeof setTimeout> | undefined,
    retry: undefined as ReturnType<typeof setTimeout> | undefined,
    clearAll() {
      if (timers.ping) clearTimeout(timers.ping);

      if (timers.retry) clearTimeout(timers.retry);

      timers.ping = undefined;
      timers.retry = undefined;
    },
  };

  return createSignalingLayer({
    type: "ntfy",
    setup(callbacks: SignalingBaseCallbacks) {
      intentionalClose = false;
      retryAttempt = 0;

      let setupDone = false;

      const scheduleRetry = () => {
        if (retryAttempt >= NTFY_MAX_RETRIES) {
          if (setupDone) {
            callbacks.onError(new SignalConnectionLostError({ url }));
          }
          else {
            setupReject?.(new Error("NTFY: SSE connection failed"));
            setupResolve = undefined;
            setupReject = undefined;
          }

          return;
        }

        retryAttempt++;
        const exponentialDelay = Math.min(
          NTFY_RETRY_INITIAL_DELAY_MS * 2 ** (retryAttempt - 1),
          NTFY_RETRY_MAX_DELAY_MS,
        );
        const delay = exponentialDelay * (0.5 + Math.random() * 0.5);

        log(`NTFY: retry #${retryAttempt} in ${Math.round(delay)}ms`);

        timers.retry = setTimeout(() => {
          timers.retry = undefined;
          open();
        }, delay);
      };

      const open = () => {
        if (ac) ac.abort();

        source?.close();

        ac = new AbortController();
        const { signal } = ac;
        let disconnected = false;

        const handleDisconnect = () => {
          if (disconnected) return;

          disconnected = true;
          ac?.abort();
          ac = undefined;
          source?.close();
          source = undefined;
          timers.clearAll();

          if (!intentionalClose) {
            if (setupDone) callbacks.onReconnecting();

            scheduleRetry();
          }
        };

        const schedulePing = () => {
          timers.ping = setTimeout(async () => {
            timers.ping = undefined;

            try {
              await fetch(pingUrl, {
                method: "HEAD",
                mode: "no-cors",
                signal: AbortSignal.timeout(NTFY_PING_TIMEOUT_MS),
              });

              if (!disconnected) schedulePing();
            }
            catch {
              if (!intentionalClose && !disconnected) {
                log("NTFY: ping failed, connection lost");
                handleDisconnect();
              }
            }
          }, NTFY_PING_INTERVAL_MS);
        };

        log("NTFY: connecting to SSE", sseUrl);
        source = new EventSource(sseUrl);

        source.addEventListener("open", () => {
          retryAttempt = 0;
          schedulePing();

          if (setupDone) {
            callbacks.onReconnected();
          }
          else {
            setupDone = true;
            setupResolve?.();
            setupResolve = undefined;
            setupReject = undefined;
          }
        }, { signal });

        source.addEventListener("error", handleDisconnect, { signal });

        source.addEventListener("message", (event) => {
          const data = JSON.parse(event.data) as NtfyMessage;

          if (data.event === "message") {
            events.emit("message", data.message);
          }
        }, { signal });
      };

      return new Promise<void>((resolve, reject) => {
        setupResolve = resolve;
        setupReject = reject;
        open();
      });
    },
    teardown() {
      intentionalClose = true;
      timers.clearAll();
      ac?.abort();
      ac = undefined;
      source?.close();
      source = undefined;

      if (setupReject) {
        setupReject(new Error("NTFY: Connection closed"));
        setupResolve = undefined;
        setupReject = undefined;
      }
    },
    async publish(body) {
      const response = await fetch(
        `${connectionInfo.protocol}://${connectionInfo.host}/${topic}`,
        {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error(`NTFY: publish failed with HTTP ${response.status}`);
      }
    },
    subscribe: (handler) => {
      events.on("message", handler);
    },
  });
};

Object.defineProperty(ntfy, "__name", { value: "ntfy" });
