import { SignalNoConnectionError } from "@openlv/core/errors";
import { EventEmitter } from "eventemitter3";
import Gun, { type IGun, type IGunInstance } from "gun";

import {
  createSignalingLayer,
  type CreateSignalLayerFn,
  type SignalingBaseEvents,
} from "../base.js";
import { log } from "../utils/log.js";

/**
 * GunDB Signaling Layer
 * https://openlv.sh/api/signaling/gun
 */
export const gundb: CreateSignalLayerFn = ({
  topic,
  url = "wss://try.axe.eco/gun",
}) => {
  const emitter = new EventEmitter<SignalingBaseEvents>();
  let connection: IGunInstance | undefined;

  return createSignalingLayer({
    type: "gundb",
    emitter,
    async setup() {
      log("GUNDB: Setting up");
      const x = new (Gun as unknown as IGun)({
        peers: [url],
        file: undefined,
        localStorage: undefined,
      });

      connection = x;

      await connection?.get(topic);
    },
    teardown() {
      // connection?.();
      connection = undefined;
    },
    async publish(payload) {
      if (!connection) throw new SignalNoConnectionError();

      log("GUNDB: Publishing message", topic, payload);
      connection.get(topic).put({ data: payload });
    },
    async subscribe(handler) {
      if (!connection) throw new SignalNoConnectionError();

      connection.get(topic).on((data) => {
        log("GUNDB: Received message", data);

        const message = data.data?.toString();

        if (!message) return;

        handler(message);
      });
    },
  });
};

Object.assign(gundb, {
  __name: "gundb",
});
