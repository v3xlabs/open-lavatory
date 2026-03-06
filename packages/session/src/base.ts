import {
  createRetrier,
  decodeConnectionURL,
  OPENLV_PROTOCOL_VERSION,
  type SessionHandshakeParameters,
  type SessionLinkParameters,
} from "@openlv/core";
import {
  deriveSymmetricKey,
  type EncryptionKey,
  generateHandshakeKey,
  generateSessionId,
  initEncryptionKeys,
  initHash,
  parseEncryptionKey,
} from "@openlv/core/encryption";
import type { BaseError } from "@openlv/core/errors";
import {
  SessionNotReadyError,
  SessionSetupError,
  SessionTimeoutError,
} from "@openlv/core/errors";
import {
  type CreateSignalLayerFn,
  SIGNAL_STATE,
  type SignalingLayer,
  type SignalState,
} from "@openlv/signaling";
import { dynamicSignalingLayer } from "@openlv/signaling/dynamic";
import {
  type TLayer,
  TRANSPORT_STATE,
  type TransportLayer,
  type TransportMessage,
} from "@openlv/transport";
import { EventEmitter } from "eventemitter3";

import type { SessionEvents } from "./events.js";
import type { SessionMessage } from "./messages/index.js";
import { log } from "./utils/log.js";

export const SESSION_STATE = {
  CREATED: "created",
  SIGNALING: "signaling",
  READY: "ready",
  LINKING: "linking",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
} as const;
export type SessionState = (typeof SESSION_STATE)[keyof typeof SESSION_STATE];

export type SessionStateObject = {
  status: SessionState;
  signaling?: {
    state: SignalState;
  };
  error?: BaseError;
};

/**
 * an OpenLV Session
 *
 * https://openlv.sh/api/session
 */
export type Session = {
  getState(): SessionStateObject;
  getHandshakeParameters(): SessionHandshakeParameters;
  connect(): Promise<void>;
  waitForLink(): Promise<void>;
  close(): Promise<void>;
  // Send with response
  send(message: object, timeout?: number): Promise<unknown>;
  emitter: EventEmitter<SessionEvents>;
  _internal: {
    signal: SignalingLayer;
    transport: TransportLayer;
  };
};

/**
 * OpenLV Session
 *
 * https://openlv.sh/api/session
 */
export const createSession = async (
  initParameters: SessionLinkParameters,
  signalLayer: CreateSignalLayerFn,
  transportLayer: TLayer,
  onMessage: (message: object) => Promise<object | string>,
): Promise<Session> => {
  const emitter = new EventEmitter<SessionEvents>();
  const messages = new EventEmitter<{ message: SessionMessage; }>();
  const sessionId
    = "sessionId" in initParameters
      ? initParameters.sessionId
      : generateSessionId();
  const {
    encryptionKey,
    decryptionKey: { decrypt },
  } = await initEncryptionKeys(initParameters);
  let relyingPublicKey: EncryptionKey | undefined;
  const handshakeKey
    = "k" in initParameters
      ? await deriveSymmetricKey(initParameters.k)
      : await generateHandshakeKey();
  const { hash, isHost } = await initHash(
    "h" in initParameters ? initParameters.h : undefined,
    encryptionKey,
  );
  let status: SessionState = SESSION_STATE.CREATED;
  let transportStarted = false;
  let transportRetryTimer: ReturnType<typeof setTimeout> | undefined;
  const transportRetrier = createRetrier({
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30_000,
  });
  const protocol = initParameters.p;
  const server = initParameters.s;

  const updateStatus = (newStatus: SessionState, error?: BaseError) => {
    log("updateStatus", newStatus);
    status = newStatus;
    emitter.emit("state_change", {
      status,
      signaling: signal.getState(),
      error,
    });
  };

  const signaling = await signalLayer({
    topic: sessionId,
    url: server,
  });
  const signal = await signaling({
    h: hash,
    canEncrypt() {
      return relyingPublicKey !== undefined;
    },
    async encrypt(message) {
      if (!relyingPublicKey) {
        throw new Error("Relying party public key not found");
      }

      log(`encrypting to ${relyingPublicKey.toString()}`, message);

      return await relyingPublicKey.encrypt(message);
    },
    decrypt,
    publicKey: encryptionKey,
    k: handshakeKey,
    async rpDiscovered(rpKey) {
      const role = isHost ? "host" : "client";

      log(`rpKey discovered by ${role}`, rpKey);

      relyingPublicKey = await parseEncryptionKey(rpKey);
    },
    isHost,
  });

  const transport = transportLayer({
    encrypt(message) {
      if (!relyingPublicKey) {
        throw new Error("Relying party public key not found");
      }

      return relyingPublicKey?.encrypt(message);
    },
    decrypt,
    isHost,
    onmessage: async (message: {
      type: string;
      payload: object;
      messageId: string;
    }) => {
      log("Session: received message from transport", message);

      if (message["type"] === "request") {
        const data = await onMessage(message["payload"] as object);
        const response: SessionMessage = {
          type: "response",
          messageId: message["messageId"] as string,
          payload: data,
        };

        await transport.send(response);
      }

      if (message["type"] === "response") {
        messages.emit("message", message);
      }
    },
    async subsend(message) {
      log("Session: sending trans msg to signal", message);
      const sessionMessage: SessionMessage = {
        type: "request",
        messageId: crypto.randomUUID(),
        payload: message,
      };

      await signal.send(sessionMessage);
    },
  });

  const onTransportStateChange = (
    state: (typeof TRANSPORT_STATE)[keyof typeof TRANSPORT_STATE],
  ) => {
    log("transport state change", state);

    if (state === TRANSPORT_STATE.CONNECTED) {
      transportRetrier.reset();
      updateStatus(SESSION_STATE.CONNECTED);
    }
  };

  const onTransportError = (error: BaseError) => {
    log("transport error", error);
    transportStarted = false;
    transport.teardown();

    const signalState = signal.getState().state;
    const step
      = signalState === SIGNAL_STATE.ENCRYPTED
        ? transportRetrier.nextDelay()
        : undefined;

    if (step) {
      log(`transport retry ${step.attempt}/5 in ${Math.round(step.delay)}ms`);
      updateStatus(SESSION_STATE.RECONNECTING);
      transportRetryTimer = setTimeout(() => startTransport(), step.delay);
    }
    else if (signalState === SIGNAL_STATE.RECONNECTING) {
      // Signal is reconnecting; transport will restart when signaling is back
      updateStatus(SESSION_STATE.RECONNECTING);
    }
    else {
      clearTimeout(transportRetryTimer);
      updateStatus(SESSION_STATE.ERROR, error);
      emitter.emit("error", error);
    }
  };

  transport.emitter.on("state_change", onTransportStateChange);
  transport.emitter.on("error", onTransportError);

  const startTransport = async () => {
    transportStarted = true;

    try {
      await transport.setup();
    }
    catch (error) {
      const setupError = new SessionSetupError({
        cause: error instanceof Error ? error : undefined,
      });

      transportStarted = false;
      updateStatus(SESSION_STATE.ERROR, setupError);
      emitter.emit("error", setupError);
    }
  };

  const onSignalMessage = async (message: object) => {
    log("Session: received message from signaling", message);

    const sessionMsg = message as SessionMessage;

    if (sessionMsg.type === "response") {
      log("Session: received data message", sessionMsg.payload);
      messages.emit("message", sessionMsg);
    }

    if (sessionMsg.type === "request") {
      log("Session: received request message", sessionMsg.payload);

      transport.handle(sessionMsg.payload as TransportMessage);
    }
  };

  const onSignalStateChange = (state: SignalState) => {
    log("signal state change", state);

    if (state === SIGNAL_STATE.RECONNECTING) {
      updateStatus(SESSION_STATE.RECONNECTING);
      // Tear down transport so it restarts cleanly when signaling is back
      clearTimeout(transportRetryTimer);
      transportRetrier.reset();
      transportStarted = false;
      transport.teardown();
    }

    if (state === SIGNAL_STATE.READY) {
      updateStatus(SESSION_STATE.READY);
    }

    if (
      (
        [
          SIGNAL_STATE.HANDSHAKE,
          SIGNAL_STATE.HANDSHAKE_PARTIAL,
        ] as SignalState[]
      ).includes(state)
    ) {
      updateStatus(SESSION_STATE.LINKING);
    }

    if (state === SIGNAL_STATE.ENCRYPTED && !transportStarted) {
      startTransport();
    }
  };

  const onSignalError = (error: BaseError) => {
    log("signal error", error);
    updateStatus(SESSION_STATE.ERROR, error);
    emitter.emit("error", error);
  };

  return {
    connect: async () => {
      updateStatus(SESSION_STATE.SIGNALING);
      log("connecting to session, isHost:", isHost);

      signal.on("message", onSignalMessage);

      signal.on("state_change", onSignalStateChange);

      signal.on("error", onSignalError);

      try {
        await signal.setup();
      }
      catch (error) {
        const setupError = new SessionSetupError({
          cause: error instanceof Error ? error : undefined,
        });

        updateStatus(SESSION_STATE.ERROR, setupError);
        emitter.emit("error", setupError);
        throw setupError;
      }
    },
    async close() {
      log("session teardown");
      clearTimeout(transportRetryTimer);

      signal.off("message", onSignalMessage);
      signal.off("state_change", onSignalStateChange);
      signal.off("error", onSignalError);
      transport.emitter.off("state_change", onTransportStateChange);
      transport.emitter.off("error", onTransportError);

      await signal.teardown();
      transport.teardown();
      updateStatus(SESSION_STATE.DISCONNECTED);
    },
    getState() {
      return {
        status,
        signaling: signal.getState(),
        // transport: transport.getState(),
      };
    },
    getHandshakeParameters() {
      return {
        version: OPENLV_PROTOCOL_VERSION,
        sessionId,
        h: hash,
        k: handshakeKey.toString(),
        p: protocol,
        s: server,
      };
    },
    waitForLink: async () =>
      new Promise<void>((resolve, reject) => {
        if (status === SESSION_STATE.CONNECTED) {
          resolve();

          return;
        }

        if (status === SESSION_STATE.ERROR) {
          reject(new SessionSetupError());

          return;
        }

        if (status === SESSION_STATE.DISCONNECTED) {
          reject(new SessionSetupError());

          return;
        }

        const onStateChange = (state?: SessionStateObject) => {
          if (state?.status === SESSION_STATE.CONNECTED) {
            emitter.off("state_change", onStateChange);
            resolve();
          }

          if (state?.status === SESSION_STATE.ERROR) {
            emitter.off("state_change", onStateChange);
            reject(state.error ?? new SessionSetupError());
          }

          if (state?.status === SESSION_STATE.DISCONNECTED) {
            emitter.off("state_change", onStateChange);
            reject(new SessionSetupError());
          }
        };

        emitter.on("state_change", onStateChange);
      }),
    async send(message: object, timeout: number = 5000) {
      const ready = signal.getState().state === SIGNAL_STATE.ENCRYPTED;

      if (!ready) {
        throw new SessionNotReadyError();
      }

      const randomID = crypto.randomUUID();
      const sessionMessage: SessionMessage = {
        type: "request",
        messageId: randomID,
        payload: message,
      };

      await transport.send(sessionMessage);

      return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          messages.off("message", onMessage);
          transport.emitter.off("error", onSendTransportError);
          clearTimeout(timer);
        };

        const onMessage = (msg: SessionMessage) => {
          if (
            !settled
            && msg.messageId === randomID
            && msg.type === "response"
          ) {
            settled = true;
            cleanup();
            resolve(msg.payload);
          }
        };

        const onSendTransportError = (error: BaseError) => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(error);
          }
        };

        messages.on("message", onMessage);
        transport.emitter.on("error", onSendTransportError);

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new SessionTimeoutError({ timeout }));
          }
        }, timeout);
      });
    },
    _internal: {
      signal,
      transport,
    },
    emitter,
  };
};

/**
 * Connect to a session from its openlv:// URL
 */
export const connectSession = async (
  connectionUrl: string,
  onMessage: (message: object) => Promise<object | string>,
  transport: TLayer,
): Promise<Session> => {
  const initParameters = decodeConnectionURL(connectionUrl);

  const signaling = await dynamicSignalingLayer(initParameters.p);

  if (!signaling) {
    throw new Error(`Invalid signaling protocol: ${initParameters.p}`);
  }

  return createSession(initParameters, signaling, transport, onMessage);
};
