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

  return createSignalingLayer({
    type: "mqtt",
    emitter,
    setup() {
      isTearingDown = false;
      let setupDone = false;

      connection = createMqtt({
        url,
        retry: { retries: 5, initialDelayMs: 1000, jitter: true },
        keepalive: 2,
      });

      connection.on("connect", () => {
        if (!setupDone) {
          setupDone = true;

          return;
        }

        log("MQTT: Reconnected, re-subscribing to topic", topic);
        const resubscribe = subscribedHandler
          ? connection!.subscribe(topic)
          : Promise.resolve();

        resubscribe
          .then(() => emitter.emit("reconnected"))
          .catch((error: unknown) => emitter.emit("error", new SignalConnectionLostError({
            url,
            cause: error instanceof Error ? error : new Error(String(error)),
          })));
      });

      connection.on("offline", () => {
        if (setupDone) {
          log("MQTT: Connection went offline, reconnecting…");
          emitter.emit("reconnecting");
        }
      });

      connection.on("close", () => {
        if (setupDone && !isTearingDown)
          emitter.emit("error", new SignalConnectionLostError({ url }));
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
      if (!connection) throw new SignalNoConnectionError();

      connection.publish(topic, payload, { retain: false });
    },
    async subscribe(handler) {
      if (!connection) throw new SignalNoConnectionError();

      subscribedHandler = handler;
      log("MQTT: Subscribing to topic", topic);
      connection.on("message", (receivedTopic, message) => {
        if (receivedTopic !== topic) return;

        handler(new TextDecoder().decode(message));
      });
      await connection.subscribe(topic);
    },
  });
};

Object.defineProperty(mqtt, "__name", { value: "mqtt" });
