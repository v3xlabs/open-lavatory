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
import type { WebRTCConfig } from "./webrtc/index.js";

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

export type TransportLayerSetupParameters = {
  isHost: boolean;
  encrypt: EncryptionKey["encrypt"];
  decrypt: DecryptionKey["decrypt"];
  subsend: (message: TransportMessage) => Promise<void>;
  onmessage: (message: { type: string; payload: object; messageId: string; }) => void;
};

export type TransportMessage =
  | {
    type: "offer";
    payload: string;
  }
  | {
    type: "answer";
    payload: string;
  }
  | {
    type: "candidate";
    payload: string;
  };
export type TransportLayer = {
  type: TransportProtocol;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  send: (message: object) => Promise<void>;
  handle: (message: TransportMessage) => Promise<void>;
  waitFor: (state: TransportState) => Promise<void>;
  emitter: EventEmitter<TLayerEventMap>;
};
export type TransportProtocol = "webrtc" | string;
export type TransportLayerFn = (parameters: TransportLayerSetupParameters) => TransportLayer;
export type Transport = (config?: WebRTCConfig) => TransportLayerFn;

export type TransportLayerImpl = {
  type: TransportProtocol;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  handle: (message: TransportMessage) => Promise<void>;
  send: (message: string) => Promise<void>;
};
export type TransportLayerBaseEventMap = {
  offer: (offer: string) => void;
  answer: (answer: string) => void;
  candidate: (candidate: string) => void;
  connected: () => void;
  message: (message: string) => void;
};
export type TransportLayerBaseEmitter =
  EventEmitter<TransportLayerBaseEventMap>;
export type TransportLayerBaseParameters = {
  emitter: TransportLayerBaseEmitter;
  isHost: boolean;
};
export type TransportLayerImplFn = (
  parameters: TransportLayerBaseParameters,
) => TransportLayerImpl;

/**
 * Base Transport Layer implementation
 *
 * https://openlv.sh/api/transport
 */
export const createTransportBase = (init: TransportLayerImplFn): TransportLayerFn => ({ encrypt, decrypt, subsend, isHost, onmessage }) => {
  const emitter = new EventEmitter<TLayerEventMap>();
  const internalEmitter = new EventEmitter<TransportLayerBaseEventMap>();
  let state: TransportState = TRANSPORT_STATE.STANDBY;

  const setState = (newState: TransportState) => {
    state = newState;
    emitter.emit("state_change", newState);
  };

  internalEmitter.on("offer", (offer) => {
    log("onOffer", offer);
    subsend({ type: "offer", payload: offer });
  });
  internalEmitter.on("answer", (answer) => {
    log("onAnswer", answer);
    subsend({ type: "answer", payload: answer });
  });
  internalEmitter.on("candidate", (candidate) => {
    log("onCandidate", candidate);
    subsend({ type: "candidate", payload: candidate });
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

  const {
    setup,
    teardown,
    type,
    send: sendLayer,
    handle,
  } = init({
    emitter: internalEmitter,
    isHost,
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
    handle,
    send,
    waitFor,
    emitter,
  };
};
