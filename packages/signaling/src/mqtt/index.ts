import {
  SignalConnectionLostError,
  SignalNoConnectionError,
} from "@openlv/core/errors";
import { createMqtt, type MqttClient } from "websocket-mqtt";

import type {
  CreateSignalLayerFn,
  SignalBaseProperties,
  SignalingBaseCallbacks,
} from "../base.js";
import { createSignalingLayer } from "../index.js";
import { log } from "../utils/log.js";

/**
 * MQTT Signaling Layer
 *
 * https://openlv.sh/api/signaling/mqtt
 */
export const mqtt: CreateSignalLayerFn = ({
  url = "wss://test.mosquitto.org:8081/mqtt",
  topic,
}: SignalBaseProperties) => {
  let connection: MqttClient | undefined;
  let subscribedHandler: ((payload: string) => void) | undefined;
  let isTearingDown = false;

  return createSignalingLayer({
    type: "mqtt",
    setup(callbacks: SignalingBaseCallbacks) {
      isTearingDown = false;

      connection = createMqtt({
        url,
        retry: {
          retries: 5,
          initialDelayMs: 1000,
          jitter: true,
        },
      });

      let setupDone = false;

      connection.on("connect", () => {
        if (!setupDone) {
          setupDone = true;

          return;
        }

        log("MQTT: Reconnected, re-subscribing to topic", topic);

        if (subscribedHandler) {
          connection!
            .subscribe(topic)
            .then(() => {
              callbacks.onReconnected();
            })
            .catch((error: unknown) => {
              callbacks.onError(
                new SignalConnectionLostError({
                  url,
                  cause: error instanceof Error ? error : new Error(String(error)),
                }),
              );
            });
        }
        else {
          callbacks.onReconnected();
        }
      });

      connection.on("offline", () => {
        if (setupDone) {
          log("MQTT: Connection went offline, reconnecting…");
          callbacks.onReconnecting();
        }
      });

      connection.on("close", () => {
        if (setupDone && !isTearingDown) {
          callbacks.onError(new SignalConnectionLostError({ url }));
        }
      });

      connection.on("error", (error) => {
        console.error("MQTT: error event", error);
      });

      return connection.connect();
    },
    teardown() {
      isTearingDown = true;
      connection?.close();
      connection = undefined;
      subscribedHandler = undefined;
    },
    async publish(payload) {
      if (!connection) {
        throw new SignalNoConnectionError();
      }

      connection.publish(topic, payload, { retain: false });
    },
    async subscribe(handler) {
      if (!connection) throw new SignalNoConnectionError();

      subscribedHandler = handler;

      log("MQTT: Subscribing to topic", topic);

      connection.on("message", (receivedTopic, message) => {
        log("MQTT: Received message on topic", topic);

        if (receivedTopic !== topic) return;

        const decoded = new TextDecoder().decode(message);

        handler(decoded);
      });

      await connection.subscribe(topic);
    },
  });
};

Object.defineProperty(mqtt, "__name", { value: "mqtt" });
