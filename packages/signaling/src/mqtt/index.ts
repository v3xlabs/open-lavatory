import {
  SignalConnectionLostError,
  SignalNoConnectionError,
} from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";
import { createMqtt, type MqttClient } from "websocket-mqtt";

import type {
  CreateSignalLayerFn,
  SignalBaseProperties,
  SignalingBaseEvents,
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
  const emitter = new EventEmitter<SignalingBaseEvents>();
  let connection: MqttClient | undefined;
  let subscribedHandler: ((payload: string) => void) | undefined;
  let isTearingDown = false;
  let isReconnecting = false;

  return createSignalingLayer({
    type: "mqtt",
    emitter,
    setup() {
      isTearingDown = false;

      connection = createMqtt({
        url,
        retry: {
          retries: 5,
          initialDelayMs: 1000,
          jitter: true,
        },
        keepalive: 2, // seconds
      });

      let setupDone = false;
      let pendingReconnect = false;

      connection.on("connect", () => {
        isReconnecting = false;
        pendingReconnect = false;

        if (!setupDone) {
          setupDone = true;

          return;
        }

        log("MQTT: Reconnected, re-subscribing to topic", topic);

        if (subscribedHandler) {
          connection!
            .subscribe(topic)
            .then(() => {
              emitter.emit("reconnected");
            })
            .catch((error: unknown) => {
              emitter.emit("error",
                new SignalConnectionLostError({
                  url,
                  cause:
                    error instanceof Error ? error : new Error(String(error)),
                }),
              );
            });
        }
        else {
          emitter.emit("reconnected");
        }
      });

      connection.on("offline", () => {
        if (setupDone) {
          isReconnecting = true;
          pendingReconnect = true;
          log("MQTT: Connection went offline, reconnecting…");
          emitter.emit("reconnecting");
        }
      });

      connection.on("reconnect", () => {
        pendingReconnect = false;
      });

      connection.on("close", () => {
        if (!setupDone || isTearingDown) return;

        if (isReconnecting && pendingReconnect) {
          isReconnecting = false;
          emitter.emit("error", new SignalConnectionLostError({ url }));

          return;
        }

        if (!isReconnecting) {
          emitter.emit("error", new SignalConnectionLostError({ url }));
        }
      });

      connection.on("error", (error) => {
        log("MQTT: error event", error);
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
