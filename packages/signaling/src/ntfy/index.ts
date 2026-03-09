import { createRetrier } from "@openlv/core";
import type { BaseError } from "@openlv/core/errors";
import {
  SignalConnectionLostError,
  SignalNoConnectionError,
  SignalPublishError,
  SignalRetryExhaustedError,
} from "@openlv/core/errors";
import { match } from "ts-pattern";

import type { CreateSignalLayerFn } from "../base.js";
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

  const wsUrl = `${wsProtocol}://${connectionInfo.host}/${topic}/ws` + (connectionInfo.parameters ?? "");
  const pingUrl = `${connectionInfo.protocol}://${connectionInfo.host}/v1/health`;

  return createSignalingLayer(({ emitter }) => {
    const retrier = createRetrier({ maxRetries: NTFY_MAX_RETRIES, initialDelayMs: NTFY_RETRY_INITIAL_DELAY_MS, maxDelayMs: NTFY_RETRY_MAX_DELAY_MS });

    let connection: WebSocket | undefined;
    let teardownAc: AbortController | undefined;
    let messageHandler: ((payload: string) => void) | undefined;
    let pingTimer: ReturnType<typeof setTimeout> | undefined;
    let onDisconnect: (() => void) | undefined;

    const schedulePing = (ws: WebSocket) => {
      if (pingTimer || teardownAc?.signal.aborted || ws !== connection) return;

      pingTimer = setTimeout(async () => {
        pingTimer = undefined;

        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), NTFY_PING_TIMEOUT_MS);
        const healthy = await fetch(pingUrl, { signal: ac.signal, cache: "no-cache" })
          .then(r => r.json().then((j: { healthy?: boolean; }) => j.healthy === true))
          .catch(() => false)
          .finally(() => clearTimeout(timeoutId));

        if (teardownAc?.signal.aborted || ws !== connection) return;

        if (!healthy) {
          log("NTFY: ping failed, closing connection");
          ws.close();

          return;
        }

        schedulePing(ws);
      }, NTFY_PING_INTERVAL_MS);
    };

    // Resolves when the WebSocket receives an "open" event from ntfy.
    // Rejects if the WebSocket closes before that happens.
    // Once connected, calls onDisconnect() when the connection later drops.
    const connect = () => new Promise<void>((resolve, reject) => {
      connection?.close();
      const ws = (connection = new WebSocket(wsUrl));
      let settled = false;

      log("NTFY: Connecting to WebSocket", wsUrl);

      ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data as string) as NtfyMessage;

        if (data.event === "open") {
          schedulePing(ws);

          if (!settled) {
            settled = true;
            resolve();
          }
        }
        else if (data.event === "message") {
          messageHandler?.(data.message);
        }
      });

      ws.addEventListener("close", () => {
        clearTimeout(pingTimer);
        pingTimer = undefined;

        if (settled) {
          onDisconnect?.();
        }
        else {
          settled = true;
          reject(new SignalConnectionLostError({ url }));
        }
      });

      ws.addEventListener("error", () => log("NTFY: WebSocket error"));
    });

    const connectWithRetry = async (ac: AbortController) => {
      while (!ac.signal.aborted) {
        try {
          await connect();

          return;
        }
        catch (error) {
          if (ac.signal.aborted) return;

          const step = retrier.nextDelay();

          if (!step) throw new SignalRetryExhaustedError({ url, cause: error instanceof Error ? error : undefined });

          log(`NTFY: retry #${step.attempt} in ${Math.round(step.delay)}ms`);
          await new Promise<void>(r => setTimeout(r, step.delay));
        }
      }
    };

    return {
      type: "ntfy",
      async setup() {
        teardownAc = new AbortController();
        const ac = teardownAc;

        retrier.reset();
        await connectWithRetry(ac);

        void (async () => {
          while (!ac.signal.aborted) {
            await new Promise<void>((r) => {
              onDisconnect = r;
            });
            onDisconnect = undefined;

            if (ac.signal.aborted) break;

            emitter.emit("reconnecting");
            retrier.reset();

            try {
              await connectWithRetry(ac);
            }
            catch (error) {
              emitter.emit("error", error as BaseError);

              return;
            }

            emitter.emit("reconnected");
          }
        })();
      },
      teardown() {
        teardownAc?.abort();
        teardownAc = undefined;
        clearTimeout(pingTimer);
        pingTimer = undefined;
        connection?.close();
        connection = undefined;
        onDisconnect?.();
        onDisconnect = undefined;
        messageHandler = undefined;
      },
      async publish(body) {
        if (!connection) throw new SignalNoConnectionError();

        const response = await fetch(
          `${connectionInfo.protocol}://${connectionInfo.host}/${topic}` + (connectionInfo.parameters ?? ""),
          { method: "POST", body, headers: { "Content-Type": "application/json" } },
        );

        if (!response.ok) {
          throw new SignalPublishError({ url, cause: new Error(`NTFY: publish failed with HTTP ${response.status}`) });
        }
      },
      subscribe(handler) {
        messageHandler = handler;
      },
    };
  });
};

Object.defineProperty(ntfy, "__name", { value: "ntfy" });
