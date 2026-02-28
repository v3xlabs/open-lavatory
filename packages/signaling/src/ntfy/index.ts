import { SignalConnectionLostError } from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";

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
  let connection: WebSocket | undefined;
  const connectionInfo = parseNtfyUrl(url);
  const wsProtocol = match(connectionInfo.protocol)
    .with("https", () => "wss")
    .with("http", () => "ws")
    .exhaustive();
  const events = new EventEmitter<{ message: string; }>();

  return createSignalingLayer({
    type: "ntfy",
    async setup(callbacks: SignalingBaseCallbacks) {
      log("NTFY: Setting up");

      const wsUrl
        = wsProtocol
          + "://"
          + connectionInfo.host
          + "/"
          + topic
          + "/ws"
          + (connectionInfo.parameters || "");

      log("NTFY: Connecting to WebSocket", wsUrl);
      connection = new WebSocket(wsUrl);

      let setupDone = false;

      const onError = () => {
        if (!setupDone) return;

        log("NTFY: WebSocket error after setup");
        callbacks.onError(new SignalConnectionLostError({ url }));
      };

      const onClose = () => {
        if (!setupDone) return;

        log("NTFY: WebSocket closed after setup");
        callbacks.onError(new SignalConnectionLostError({ url }));
      };

      connection.addEventListener("error", onError);
      connection.addEventListener("close", onClose);

      await new Promise<void>((resolve, reject) => {
        const onSetupError = () => {
          reject(new Error("NTFY: WebSocket connection error during setup"));
        };

        const onSetupClose = () => {
          reject(new Error("NTFY: WebSocket closed before setup completed"));
        };

        connection!.addEventListener("error", onSetupError);
        connection!.addEventListener("close", onSetupClose);

        connection!.addEventListener("message", (event) => {
          log("NTFY: Received message:", event.data);
          const data = JSON.parse(event.data as string) as NtfyMessage;

          if (data.event === "open") {
            connection!.removeEventListener("error", onSetupError);
            connection!.removeEventListener("close", onSetupClose);
            setupDone = true;
            resolve();
          }
          else if (data.event === "message") {
            events.emit("message", data.message);
          }
        });

        connection!.addEventListener("open", () => {
          log("NTFY: WebSocket connected");
        });
      });
    },
    teardown() {
      connection?.close();
      connection = undefined;
    },
    async publish(body) {
      const headers = { "Content-Type": "application/json" } as HeadersInit;

      const response = await fetch(
        `${connectionInfo.protocol}://${connectionInfo.host}/${topic}`,
        { method: "POST", body, headers },
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
