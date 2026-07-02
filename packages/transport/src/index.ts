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
  DISCONNECTED: "disconnected",
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
  onmessage: (message: { type: string; payload?: object | string; messageId: string; }) => void;
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
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  send: (message: object, options?: TransportSendOptions) => Promise<void>;
  handle: (message: TransportMessage) => Promise<void>;
  waitFor: (state: TransportState) => Promise<void>;
  emitter: EventEmitter<TLayerEventMap>;
};
export type TransportSendOptions = {
  allowReady?: boolean;
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
  ready: () => void;
  close: () => void;
  error: (error?: unknown) => void;
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

export type TransportLivenessConfig = {
  probeInterval?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
};

const TRANSPORT_CONTROL_TYPE = "__openlv_transport";
const DEFAULT_PROBE_INTERVAL = 250;
const DEFAULT_HEARTBEAT_INTERVAL = 2000;
const DEFAULT_HEARTBEAT_TIMEOUT = 5000;
const TRANSPORT_TERMINAL_STATES: TransportState[] = [
  TRANSPORT_STATE.DISCONNECTED,
  TRANSPORT_STATE.ERROR,
];

type TransportControlMessage = {
  type: typeof TRANSPORT_CONTROL_TYPE;
  action: "ping" | "pong";
};
type TransportPayload = Partial<TransportControlMessage> & {
  type?: string;
  payload?: object | string;
  messageId: string;
};

/**
 * Base Transport Layer implementation
 *
 * https://openlv.sh/api/transport
 */
export const createTransportBase = (
  init: TransportLayerImplFn,
  livenessConfig: TransportLivenessConfig = {},
): TransportLayerFn => ({ encrypt, decrypt, subsend, isHost, onmessage }) => {
  const emitter = new EventEmitter<TLayerEventMap>();
  const internalEmitter = new EventEmitter<TransportLayerBaseEventMap>();
  let state: TransportState = TRANSPORT_STATE.STANDBY;
  let livenessTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingPingSince: number | undefined;
  const {
    probeInterval = DEFAULT_PROBE_INTERVAL,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    heartbeatTimeout = DEFAULT_HEARTBEAT_TIMEOUT,
  } = livenessConfig;

  const setState = (newState: TransportState) => {
    if (state === newState) return;

    state = newState;
    emitter.emit("state_change", newState);
  };

  const stopLiveness = () => {
    if (livenessTimer) clearTimeout(livenessTimer);

    livenessTimer = undefined;
    pendingPingSince = undefined;
  };

  const sendControl = async (action: TransportControlMessage["action"]) => {
    const payload = await encrypt(JSON.stringify({
      type: TRANSPORT_CONTROL_TYPE,
      action,
    } satisfies TransportControlMessage));

    await sendLayer(payload);
  };

  const failLiveness = () => {
    stopLiveness();
    setState(TRANSPORT_STATE.ERROR);
  };

  const sendPing = () => {
    if (state === TRANSPORT_STATE.CONNECTED && pendingPingSince === undefined) {
      pendingPingSince = Date.now();
    }

    void sendControl("ping").catch((error) => {
      log("transport ping failed", error);

      if (state === TRANSPORT_STATE.CONNECTED) failLiveness();
    });
  };

  const checkLiveness = () => {
    if (
      state === TRANSPORT_STATE.CONNECTED
      && pendingPingSince !== undefined
      && Date.now() - pendingPingSince > heartbeatTimeout
    ) {
      failLiveness();

      return;
    }

    sendPing();

    const interval = state === TRANSPORT_STATE.CONNECTED
      ? heartbeatInterval
      : probeInterval;

    if (interval <= 0) {
      livenessTimer = undefined;

      return;
    }

    livenessTimer = setTimeout(checkLiveness, interval);
  };

  const startLiveness = () => {
    if (livenessTimer) return;

    if (probeInterval <= 0) {
      setState(TRANSPORT_STATE.CONNECTED);

      return;
    }

    livenessTimer = setTimeout(checkLiveness, probeInterval);
  };

  const handleControlMessage = async (action: string) => {
    if (state !== TRANSPORT_STATE.READY && state !== TRANSPORT_STATE.CONNECTED) {
      return;
    }

    pendingPingSince = undefined;
    setState(TRANSPORT_STATE.CONNECTED);

    if (action === "ping") {
      await sendControl("pong");
    }
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
  internalEmitter.on("ready", () => {
    log("onReady");
    startLiveness();
  });
  internalEmitter.on("close", () => {
    log("onClose");
    stopLiveness();
    setState(TRANSPORT_STATE.DISCONNECTED);
  });
  internalEmitter.on("error", (error) => {
    log("onError", error);
    stopLiveness();
    setState(TRANSPORT_STATE.ERROR);
  });
  internalEmitter.on("message", async (message) => {
    try {
      log("onMessage", message);
      const data = await decrypt(message);
      const parsed = JSON.parse(data) as TransportPayload;

      if (parsed?.type === TRANSPORT_CONTROL_TYPE) {
        if (parsed.action === "ping" || parsed.action === "pong")
          await handleControlMessage(parsed.action);

        return;
      }

      pendingPingSince = undefined;
      onmessage(parsed as { type: string; payload?: object | string; messageId: string; });
    }
    catch (error) {
      log("transport message handling failed", error);
      stopLiveness();
      setState(TRANSPORT_STATE.ERROR);
    }
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

  const send = async (
    message: object,
    { allowReady = false }: TransportSendOptions = {},
  ) => {
    const canSend = state === TRANSPORT_STATE.CONNECTED
      || (allowReady && state === TRANSPORT_STATE.READY);

    if (!canSend)
      throw new Error("Transport not connected");

    const payload = await encrypt(JSON.stringify(message));

    await sendLayer(payload);
  };

  const waitFor = async (targetState: TransportState) => {
    if (state === targetState) return;

    if (TRANSPORT_TERMINAL_STATES.includes(state)) {
      throw new Error(`Transport reached terminal state: ${state}`);
    }

    return new Promise<void>((resolve, reject) => {
      const handler = (newState: TransportState) => {
        if (newState === targetState) {
          emitter.off("state_change", handler);
          resolve();

          return;
        }

        if (TRANSPORT_TERMINAL_STATES.includes(newState)) {
          emitter.off("state_change", handler);
          reject(new Error(`Transport reached terminal state: ${newState}`));
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

      if (state === TRANSPORT_STATE.CONNECTING) {
        setState(TRANSPORT_STATE.READY);
      }
    },
    async teardown() {
      stopLiveness();

      await teardown();
    },
    handle,
    send,
    waitFor,
    emitter,
  };
};
