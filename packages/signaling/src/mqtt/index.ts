import { SignalNoConnectionError } from "@openlv/core/errors";
import type { MqttClient } from "mqtt";
import MQTT from "mqtt";

import type { CreateSignalLayerFn, SignalBaseProperties } from "../base.js";
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

  return createSignalingLayer({
    type: "mqtt",
    async setup() {
      connection = await MQTT.connectAsync(
        url,
        {
          reconnectOnConnackError: false,
          reconnectPeriod: 5000,
          connectTimeout: 5000,
        },
        false,
      );
    },
    teardown() {
      connection?.end(true, {});
      connection = undefined;
    },
    async publish(payload) {
      if (!connection) {
        throw new Error("MQTT: No connection to publish to");
      }

      connection?.publish(topic, payload, { retain: false });
    },
    async subscribe(handler) {
      if (!connection) throw new SignalNoConnectionError();

      log("MQTT: Subscribing to topic", topic);

      connection.on("message", (receivedTopic, message) => {
        log("MQTT: Received message on topic", topic);

        if (receivedTopic !== topic) return;

        const decoded = new TextDecoder().decode(message);

        handler(decoded);
      });

      return new Promise((resolve, reject) => {
        connection?.subscribe(topic, (err) => {
          if (err) {
            log("MQTT: Error subscribing to topic", err);
            reject(err);
          }

          resolve();
        });
      });
    },
  });
};

Object.defineProperty(mqtt, "__name", { value: "mqtt" });
