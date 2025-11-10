import { make } from "@openlv/core";
import type { EncryptionKey, SymmetricKey } from "@openlv/core/encryption";
import { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";
import type { MaybePromise } from "viem";

import type { SignalEventMap, SignalState } from "./layer.js";
import { SIGNAL_STATE } from "./layer.js";
import type { SignalMessage } from "./messages/index.js";
import { log } from "./utils/log.js";

export type SignalBaseProperties = {
  topic: string;
  url: string;
};

export type SignalingBaseLayer = {
  type: string;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  publish: (payload: string) => MaybePromise<void>;
  subscribe: (handler: (payload: string) => void) => MaybePromise<void>;
};

export type CreateSignalLayerFn = (
  properties: SignalBaseProperties,
) => MaybePromise<SignalingLayerFn>;

export type SignalingProperties = {
  isHost: boolean;
  h: string;
  k?: SymmetricKey;
  rpDiscovered: (rpKey: string) => MaybePromise<void>;
  // Decrypt using our private key
  decrypt: (message: string) => MaybePromise<string>;
  // Encrypt to relying party
  encrypt: (message: string) => MaybePromise<string>;
  // our public key
  publicKey: EncryptionKey;
  canEncrypt: () => boolean;
};

export type SignalingContext = {
  type: string;
  // waitForConnection: () => Promise<void>;
  // reconnect: () => void;

  // Sending only works once keys are exchanged
  send: (message: object) => MaybePromise<void>;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;

  getState: () => {
    state: SignalState;
  };
};
export type SignalingLayer = EventEmitter<SignalEventMap> & SignalingContext;
export type SignalingLayerFn = (
  properties: SignalingProperties,
) => Promise<SignalingLayer>;

export const XR_PREFIX = "x";
export const XR_H_PREFIX = "h";

/**
 * Base Signaling Layer implementation
 *
 * https://openlv.sh/api/signaling
 */
export const createSignalingLayer = (
  init: SignalingBaseLayer,
): SignalingLayerFn => {
  return async ({
    canEncrypt,
    encrypt,
    decrypt,
    rpDiscovered,
    k,
    publicKey,
    isHost,
  }: SignalingProperties) => {
    const emitter = new EventEmitter<SignalEventMap>();
    let state: SignalState = SIGNAL_STATE.STANDBY;
    const setState = (_state: SignalState) => {
      state = _state;
      emitter.emit("state_change", _state);
    };
    const handshakeKey = k ? k : undefined;

    const send = async (
      method: "handshake" | "encrypted",
      recipient: "h" | "c",
      payload: SignalMessage,
    ) => {
      const prefix = match(method)
        .with("handshake", () => XR_H_PREFIX)
        .with("encrypted", () => XR_PREFIX)
        .exhaustive();

      const message = await match(method)
        .with("handshake", () => {
          if (!handshakeKey) return;

          return handshakeKey.encrypt(JSON.stringify(payload));
        })
        .with("encrypted", () => {
          if (!canEncrypt()) return;

          return encrypt(JSON.stringify(payload));
        })
        .exhaustive();

      await init.publish(prefix + recipient + message);
    };

    const handleReceive = async (payload: string) => {
      const prefix = payload.slice(0, XR_H_PREFIX.length);
      const recipient = payload.slice(
        XR_H_PREFIX.length,
        XR_H_PREFIX.length + 1,
      );
      const body = payload.slice(XR_PREFIX.length + 1);
      const isRecipient = (isHost ? "h" : "c") === recipient;

      log("isRecipient", isRecipient);

      if (!isRecipient) return;

      await match({ prefix, body })
        .with({ prefix: XR_H_PREFIX }, async () => {
          if (!handshakeKey) return;

          const message = await handshakeKey.decrypt(body);
          const msg = JSON.parse(message) as SignalMessage;

          await match(msg)
            .with({ type: "flash" }, async () => {
              if (!isHost) return;

              setState(SIGNAL_STATE.HANDSHAKE);
              await send("handshake", "c", {
                type: "pubkey",
                payload: {
                  publicKey: publicKey.toString(),
                },
                timestamp: Date.now(),
              });
            })
            .with({ type: "pubkey" }, async ({ payload }) => {
              if (isHost) return;

              await rpDiscovered(payload.publicKey);
              setState(SIGNAL_STATE.HANDSHAKE_PARTIAL);

              return await send("encrypted", "h", {
                type: "pubkey",
                payload: {
                  publicKey: publicKey.toString(),
                },
                timestamp: Date.now(),
              });
            })
            .otherwise(() => {
              log("Received invalid message H", msg);
            });
        })
        .with({ prefix: XR_PREFIX }, async () => {
          const message = await decrypt(body);
          const msg = JSON.parse(message) as SignalMessage;

          await match(msg)
            .with({ type: "pubkey" }, async ({ payload }) => {
              if (!isHost) return;

              await rpDiscovered(payload.publicKey);
              setState(SIGNAL_STATE.HANDSHAKE_PARTIAL);

              return await send("encrypted", "c", {
                type: "ack",
                payload: undefined,
                timestamp: Date.now(),
              });
            })
            .with({ type: "ack" }, async () => {
              if (state !== SIGNAL_STATE.HANDSHAKE_PARTIAL) return;

              setState(SIGNAL_STATE.ENCRYPTED);

              if (isHost) return;

              return await send("encrypted", "h", {
                type: "ack",
                payload: undefined,
                timestamp: Date.now(),
              });
            })
            .with({ type: "data" }, async () =>
              emitter.emit("message", msg.payload as object),
            )
            .otherwise(() => {
              log("Received invalid message X", msg);
            });
        })
        .otherwise(() => {
          log("Received invalid message", payload);
        });
    };

    return make(emitter, {
      type: init.type,
      async setup() {
        setState(SIGNAL_STATE.CONNECTING);
        await init.setup();

        if (!canEncrypt()) {
          if (!isHost) {
            setState(SIGNAL_STATE.READY);
            await send("handshake", "h", {
              type: "flash",
              payload: {},
              timestamp: Date.now(),
            });
            setState(SIGNAL_STATE.HANDSHAKE);
          }

          if (isHost) {
            setState(SIGNAL_STATE.READY);
          }
        }

        await init.subscribe(handleReceive);
      },
      async teardown() {
        log("teardown");
        await init.teardown?.();
      },
      send(message: object) {
        if (!canEncrypt()) {
          return Promise.reject(
            new Error("Cannot encrypt message before keys are exchanged"),
          );
        }

        const them = isHost ? "c" : "h";

        return send("encrypted", them, {
          type: "data",
          payload: message,
          timestamp: Date.now(),
        });
      },
      getState() {
        return { state: state };
      },
    });
  };
};
