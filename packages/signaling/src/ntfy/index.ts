import { EventEmitter } from "eventemitter3";
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
 * Uses HTTP Post for publishing
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
export const ntfy: CreateSignalLayerFn = ({ topic, url }) => {
  let connection: WebSocket | null = null;
  const connectionInfo = parseNtfyUrl(url);
  const wsProtocol = match(connectionInfo.protocol)
    .with("https", () => "wss")
    .with("http", () => "ws")
    .exhaustive();
  const events = new EventEmitter<{ message: string }>();

  return createSignalingLayer({
    type: "ntfy",
    async setup() {
      log("NTFY: Setting up");

      const wsUrl =
        wsProtocol +
        "://" +
        connectionInfo.host +
        "/" +
        topic +
        "/ws" +
        (connectionInfo.parameters || "");

      log("NTFY: Connecting to WebSocket", wsUrl);
      connection = new WebSocket(wsUrl);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      connection.onerror = (_event) => {};

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      connection.onclose = (_event) => {};

      const awaitOpenConfirm = new Promise<void>((resolve) => {
        connection!.onmessage = (event) => {
          log("NTFY: Received message:", event.data);
          const data = JSON.parse(event.data) as NtfyMessage;

          if (data.event === "open") {
            resolve();
          } else if (data.event === "message") {
            events.emit("message", data.message);
          }
        };
      });

      const awaitOpen = new Promise<void>((resolve) => {
        connection!.onopen = () => {
          log("NTFY: Connected to WebSocket");
          resolve();
        };
      });

      await awaitOpen;
      await awaitOpenConfirm;
    },
    teardown() {
      connection?.close();
    },
    async publish(body) {
      const headers = { "Content-Type": "application/json" } as HeadersInit;

      // TODO: Add response handling
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _response = await fetch(
        `${connectionInfo.protocol}://${connectionInfo.host}/${topic}`,
        { method: "POST", body, headers },
      );
    },
    subscribe: (handler) => {
      events.on("message", handler);
    },
  });
};

Object.defineProperty(ntfy, "__name", { value: "ntfy" });
