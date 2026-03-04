import {
  SignalConnectionLostError,
  SignalNoConnectionError,
  SignalPublishError,
  SignalRetryExhaustedError,
  SignalTeardownError,
} from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";

import type { CreateSignalLayerFn, SignalingBaseCallbacks } from "../base.js";
import { createSignalingLayer } from "../index.js";
import { log } from "../utils/log.js";
import { createRetrier } from "../utils/retry.js";
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
 * Uses WebSocket for subscribing
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

  const wsProtocol = match(connectionInfo.protocol)
    .with("https", () => "wss" as const)
    .with("http", () => "ws" as const)
    .exhaustive();

  const wsUrl
    = `${wsProtocol}://${connectionInfo.host}/${topic}/ws`
      + (connectionInfo.parameters ?? "");
  const pingUrl = `${connectionInfo.protocol}://${connectionInfo.host}/v1/health`;

  const events = new EventEmitter<{ message: string; }>();

  let connection: WebSocket | undefined;
  let intentionalClose = false;
  let setupDone = false;
  let setupPromise: Promise<void> | undefined;
  let reconnectPromise: Promise<void> | undefined;
  let openResolver:
    | { resolve: () => void; reject: (err: Error) => void; }
    | undefined;

  const retrier = createRetrier({
    maxRetries: NTFY_MAX_RETRIES,
    initialDelayMs: NTFY_RETRY_INITIAL_DELAY_MS,
    maxDelayMs: NTFY_RETRY_MAX_DELAY_MS,
  });

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

  const pingOnce = async () => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      NTFY_PING_TIMEOUT_MS,
    );

    try {
      const response = await fetch(pingUrl, {
        signal: abortController.signal,
        cache: "no-cache",
      });
      const json = await response.json();

      return (json as { healthy?: boolean; }).healthy === true;
    }
    catch {
      return false;
    }
    finally {
      clearTimeout(timeoutId);
    }
  };

  const schedulePing = (ws: WebSocket) => {
    if (timers.ping || intentionalClose || ws !== connection) return;

    timers.ping = setTimeout(async () => {
      timers.ping = undefined;

      const healthy = await pingOnce();

      if (intentionalClose || ws !== connection) return;

      if (!healthy) {
        log("NTFY: ping failed, closing connection");
        ws.close();

        return;
      }

      schedulePing(ws);
    }, NTFY_PING_INTERVAL_MS);
  };

  return createSignalingLayer({
    type: "ntfy",
    setup(callbacks: SignalingBaseCallbacks) {
      intentionalClose = false;

      const waitForOpen = () =>
        new Promise<void>((resolve, reject) => {
          openResolver = { resolve, reject };
        });

      const connectWithRetry = async () => {
        retrier.reset();

        while (!intentionalClose) {
          open();

          try {
            await waitForOpen();

            return;
          }
          catch (error) {
            if (intentionalClose) break;

            const step = retrier.nextDelay();

            if (!step) {
              throw new SignalRetryExhaustedError({
                url,
                cause: error instanceof Error ? error : undefined,
              });
            }

            log(`NTFY: retry #${step.attempt} in ${Math.round(step.delay)}ms`);
            await new Promise<void>((resolve) => {
              timers.retry = setTimeout(() => {
                timers.retry = undefined;
                resolve();
              }, step.delay);
            });
          }
        }

        throw new SignalTeardownError({ url });
      };

      const open = () => {
        connection?.close();
        connection = undefined;
        timers.clearAll();

        log("NTFY: connecting to WebSocket", wsUrl);
        const ws = new WebSocket(wsUrl);

        connection = ws;

        ws.addEventListener("message", (event) => {
          const data = JSON.parse(event.data as string) as NtfyMessage;

          if (data.event === "open") {
            schedulePing(ws);

            if (setupDone) {
              callbacks.onReconnected();
            }
            else {
              setupDone = true;
            }

            if (openResolver) {
              openResolver.resolve();
              openResolver = undefined;
            }

            return;
          }

          if (data.event === "message") {
            events.emit("message", data.message);
          }
        });

        ws.addEventListener("close", () => {
          timers.clearAll();

          if (intentionalClose) return;

          if (openResolver) {
            openResolver.reject(new SignalConnectionLostError({ url }));
            openResolver = undefined;
          }

          log("NTFY: WebSocket closed unexpectedly");

          if (setupDone) callbacks.onReconnecting();

          if (setupDone && !reconnectPromise) {
            reconnectPromise = (async () => {
              try {
                await connectWithRetry();
              }
              catch {
                callbacks.onError(new SignalRetryExhaustedError({ url }));
              }
              finally {
                reconnectPromise = undefined;
              }
            })();
          }
        });

        ws.addEventListener("error", () => {
          log("NTFY: WebSocket error");
        });
      };

      if (setupDone) return Promise.resolve();

      if (!setupPromise) {
        setupPromise = (async () => {
          try {
            await connectWithRetry();
          }
          finally {
            setupPromise = undefined;
          }
        })();
      }

      return setupPromise;
    },
    teardown() {
      intentionalClose = true;
      setupDone = false;
      setupPromise = undefined;
      reconnectPromise = undefined;
      timers.clearAll();
      connection?.close();
      connection = undefined;

      if (openResolver) {
        openResolver.reject(new SignalTeardownError({ url }));
        openResolver = undefined;
      }
    },
    async publish(body) {
      if (!connection) {
        throw new SignalNoConnectionError();
      }

      const response = await fetch(
        `${connectionInfo.protocol}://${connectionInfo.host}/${topic}`
        + (connectionInfo.parameters ?? ""),
        {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new SignalPublishError({
          url,
          cause: new Error(`NTFY: publish failed with HTTP ${response.status}`),
        });
      }
    },
    subscribe: (handler) => {
      events.on("message", handler);
    },
  });
};

Object.defineProperty(ntfy, "__name", { value: "ntfy" });
