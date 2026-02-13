import { EventEmitter } from "eventemitter3";
import type { MaybePromise } from "viem";

import {
  type TLayerEventMap,
  TRANSPORT_STATE,
  type TransportLayerParameters,
  type TransportState,
} from "./layer.js";
import type { WebRTCConfig } from "./webrtc/index.js";

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
  type: string;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
  send: (message: object) => Promise<void>;
  handle: (message: TransportMessage) => Promise<void>;
  waitFor: (state: TransportState) => Promise<void>;
  emitter: EventEmitter<TLayerEventMap>;
};
export type TLayer = (parameters: TransportLayerParameters) => TransportLayer;
export type CreateTransportLayerFn = (config?: WebRTCConfig) => TLayer;
export type TransportLayerBase = {
  type: string;
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
export type TransportLayerBaseInit = (
  parameters: TransportLayerBaseParameters,
) => TransportLayerBase;

/**
 * Base Transport Layer implementation
 *
 * https://openlv.sh/api/transport
 */
export const createTransportBase = (init: TransportLayerBaseInit): TLayer => ({ encrypt, decrypt, subsend, isHost, onmessage }) => {
  const emitter = new EventEmitter<TLayerEventMap>();
  const internalEmitter = new EventEmitter<TransportLayerBaseEventMap>();
  let state: TransportState = TRANSPORT_STATE.STANDBY;

  const setState = (newState: TransportState) => {
    state = newState;
    emitter.emit("state_change", newState);
  };

  internalEmitter.on("offer", (offer) => {
    console.log("onOffer", offer);
    subsend({ type: "offer", payload: offer });
  });
  internalEmitter.on("answer", (answer) => {
    console.log("onAnswer", answer);
    subsend({ type: "answer", payload: answer });
  });
  internalEmitter.on("candidate", (candidate) => {
    console.log("onCandidate", candidate);
    subsend({ type: "candidate", payload: candidate });
  });
  internalEmitter.on("connected", () => {
    console.log("onConnected");
    setState(TRANSPORT_STATE.CONNECTED);
  });
  internalEmitter.on("message", async (message) => {
    console.log("onMessage", message);
    const data = await decrypt(message);

    onmessage(JSON.parse(data) as object);
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

  const waitFor = async (state: TransportState) => new Promise<void>((resolve) => {
    emitter.on("state_change", (newState) => {
      if (newState === state) {
        resolve();
      }
    });
  });

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
