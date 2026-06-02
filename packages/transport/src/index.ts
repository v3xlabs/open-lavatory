/**
 * Open Lavatory Protocol - Decentralized Wallet Connection Library
 *
 * A privacy-first, peer-to-peer protocol for connecting dApps with wallets
 * without relying on centralized infrastructure.
 */
import type { DecryptionKey, EncryptionKey } from "@openlv/core/encryption";
import { EventEmitter } from "eventemitter3";
import type { MaybePromise } from "viem";

import { log } from "./utils/log.js";

export const TRANSPORT_STATE = {
  STANDBY: "standby",
  CONNECTING: "connecting",
  READY: "ready",
  CONNECTED: "connected",
  ERROR: "error",
} as const;
export type TransportState =
  (typeof TRANSPORT_STATE)[keyof typeof TRANSPORT_STATE];

export type TLayerEventMap = {
  state_change: (state: TransportState) => void;
};

export type TransportProtocol = string;

export type TransportOptionsMessage = {
  type: "transport-options";
  payload: {
    transports: TransportProtocol[];
  };
};
export type TransportSelectMessage = {
  type: "transport-select";
  payload: {
    transport: TransportProtocol;
  };
};
export type TransportMessage = {
  type: "transport-data";
  transport: TransportProtocol;
  payload: object | string;
};
export type TransportOfferMessage =
  | TransportMessage
  | TransportOptionsMessage
  | TransportSelectMessage;

export type TransportLayerParameters = {
  isHost: boolean;
  encrypt: EncryptionKey["encrypt"];
  decrypt: DecryptionKey["decrypt"];
  subsend: (message: TransportOfferMessage) => Promise<void>;
  onmessage: (message: { type: string; payload: object; messageId: string; }) => void;
};

export type TransportLayer = {
  type: TransportProtocol;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  send: (message: object) => Promise<void>;
  handle: (message: object | string) => Promise<void>;
  waitFor: (state: TransportState) => Promise<void>;
  emitter: EventEmitter<TLayerEventMap>;
};
export type TLayer = (parameters: TransportLayerParameters) => TransportLayer;
export type CreateTransportLayerFn<TConfig = unknown> = (config?: TConfig) => TLayer;
export type TransportLayerBase<TSignalMessage extends object | string = object | string> = {
  type: TransportProtocol;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  handle: (message: TSignalMessage) => Promise<void>;
  send: (message: string) => Promise<void>;
};
export type TransportLayerBaseEventMap<TSignalMessage extends object | string = object | string> = {
  signal: (message: TSignalMessage) => void;
  connected: () => void;
  message: (message: string) => void;
};
export type TransportLayerBaseEmitter<TSignalMessage extends object | string = object | string> =
  EventEmitter<TransportLayerBaseEventMap<TSignalMessage>>;
export type TransportLayerBaseParameters<TSignalMessage extends object | string = object | string> = {
  emitter: TransportLayerBaseEmitter<TSignalMessage>;
  isHost: boolean;
};
export type TransportLayerBaseInit<TSignalMessage extends object | string = object | string> = (
  parameters: TransportLayerBaseParameters<TSignalMessage>,
) => TransportLayerBase<TSignalMessage>;

/**
 * Base Transport Layer implementation
 *
 * https://openlv.sh/api/transport
 */
export const createTransportBase = <TSignalMessage extends object | string = object | string>(init: TransportLayerBaseInit<TSignalMessage>): TLayer => ({ encrypt, decrypt, subsend, isHost, onmessage }) => {
  const emitter = new EventEmitter<TLayerEventMap>();
  const internalEmitter = new EventEmitter<TransportLayerBaseEventMap<TSignalMessage>>();
  let state: TransportState = TRANSPORT_STATE.STANDBY;

  const setState = (newState: TransportState) => {
    state = newState;
    emitter.emit("state_change", newState);
  };

  const {
    setup,
    teardown,
    type,
    send: sendLayer,
    handle: handleSignal,
  } = init({
    emitter: internalEmitter,
    isHost,
  });

  internalEmitter.on("signal", (message) => {
    log("onSignal", message);
    subsend({ type: "transport-data", transport: type, payload: message });
  });
  internalEmitter.on("connected", () => {
    log("onConnected");
    setState(TRANSPORT_STATE.CONNECTED);
  });
  internalEmitter.on("message", async (message) => {
    log("onMessage", message);
    const data = await decrypt(message);

    onmessage(JSON.parse(data) as { type: string; payload: object; messageId: string; });
  });

  const send = async (message: object) => {
    if (state !== TRANSPORT_STATE.CONNECTED)
      throw new Error("Transport not connected");

    const payload = await encrypt(JSON.stringify(message));

    await sendLayer(payload);
  };

  const waitFor = async (targetState: TransportState) => {
    if (state === targetState) return;

    return new Promise<void>((resolve) => {
      const handler = (newState: TransportState) => {
        if (newState === targetState) {
          emitter.off("state_change", handler);
          resolve();
        }
      };

      emitter.on("state_change", handler);
    });
  };

  return {
    type,
    async setup() {
      setState(TRANSPORT_STATE.CONNECTING);
      await setup();
      setState(TRANSPORT_STATE.READY);
    },
    teardown,
    handle(message) {
      return handleSignal(message as TSignalMessage);
    },
    send,
    waitFor,
    emitter,
  };
};
