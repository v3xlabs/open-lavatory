import { createRetrier } from "@openlv/core";
import {
  SignalConnectionLostError,
  SignalNoConnectionError,
  SignalPublishError,
  SignalRetryExhaustedError,
  SignalTeardownError,
} from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";

import type { CreateSignalLayerFn, SignalingBaseEvents } from "../base.js";
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

  const emitter = new EventEmitter<SignalingBaseEvents>();
  const events = new EventEmitter<{ message: string; }>();
  const retrier = createRetrier({ maxRetries: NTFY_MAX_RETRIES, initialDelayMs: NTFY_RETRY_INITIAL_DELAY_MS, maxDelayMs: NTFY_RETRY_MAX_DELAY_MS });

  let connection: WebSocket | undefined;
  let teardownAc: AbortController | undefined;
  let setupDone = false;
  let reconnectPromise: Promise<void> | undefined;
  let pingTimer: ReturnType<typeof setTimeout> | undefined;

  const clearPing = () => {
    clearTimeout(pingTimer);
    pingTimer = undefined;
  };

  const pingOnce = async () => {
    const ac = new AbortController();
    const ntfyTimeoutId = setTimeout(() => ac.abort(), NTFY_PING_TIMEOUT_MS);

    try {
      const r = await fetch(pingUrl, { signal: ac.signal, cache: "no-cache" });

      return ((await r.json()) as { healthy?: boolean; }).healthy === true;
    }
    catch { return false; }
    finally { clearTimeout(ntfyTimeoutId); }
  };

  const schedulePing = (ws: WebSocket) => {
    if (pingTimer || teardownAc?.signal.aborted || ws !== connection) return;

    pingTimer = setTimeout(async () => {
      pingTimer = undefined;

      const healthy = await pingOnce();

      if (teardownAc?.signal.aborted || ws !== connection) return;

      if (!healthy) {
        log("NTFY: ping failed, closing connection");
        ws.close();

        return;
      }

      schedulePing(ws);
    }, NTFY_PING_INTERVAL_MS);
  };

  // open() calls onOpen on first "open" ntfy event, onFail on close before open
  const open = (onOpen: () => void, onFail: (err: Error) => void) => {
    connection?.close();
    connection = undefined;
    clearPing();

    log("NTFY: connecting to WebSocket", wsUrl);
    const ws = (connection = new WebSocket(wsUrl));
    let settled = false;

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string) as NtfyMessage;

      if (data.event === "open") {
        schedulePing(ws);

        if (setupDone) {
          emitter.emit("reconnected");
        }
        else { setupDone = true; }

        if (!settled) {
          settled = true;
          onOpen();
        }

        return;
      }

      if (data.event === "message") {
        events.emit("message", data.message);
      }
    });

    ws.addEventListener("close", () => {
      clearPing();

      if (teardownAc?.signal.aborted) return;

      if (!settled) {
        settled = true;
        onFail(new SignalConnectionLostError({ url }));
      }

      log("NTFY: WebSocket closed unexpectedly");

      if (setupDone) emitter.emit("reconnecting");

      if (setupDone && !reconnectPromise) {
        reconnectPromise = connectWithRetry()
          .catch((error) => {
            if (error instanceof SignalTeardownError) return;

            emitter.emit("error", new SignalRetryExhaustedError({ url }));
          })
          .finally(() => { reconnectPromise = undefined; });
      }
    });

    ws.addEventListener("error", () => {
      log("NTFY: WebSocket error");
    });
  };

  const connectWithRetry = async (): Promise<void> => {
    const ac = teardownAc!;

    retrier.reset();

    while (!ac.signal.aborted) {
      try {
        await new Promise<void>((resolve, reject) => open(resolve, reject));

        return;
      }
      catch (error) {
        if (ac.signal.aborted) break;

        const step = retrier.nextDelay();

        if (!step) {
          throw new SignalRetryExhaustedError({ url, cause: error instanceof Error ? error : undefined });
        }

        log(`NTFY: retry #${step.attempt} in ${Math.round(step.delay)}ms`);
        await new Promise<void>(resolve => setTimeout(resolve, step.delay));
      }
    }

    throw new SignalTeardownError({ url });
  };

  return createSignalingLayer({
    type: "ntfy",
    emitter,
    setup() {
      teardownAc = new AbortController();

      if (setupDone) return Promise.resolve();

      return connectWithRetry();
    },
    teardown() {
      teardownAc?.abort();
      teardownAc = undefined;
      setupDone = false;
      reconnectPromise = undefined;
      clearPing();
      connection?.close();
      connection = undefined;
      events.removeAllListeners();
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
    subscribe: (handler) => {
      events.on("message", handler);
    },
  });
};

Object.defineProperty(ntfy, "__name", { value: "ntfy" });
