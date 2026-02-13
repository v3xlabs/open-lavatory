import {
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
} as const;
export type SessionState = (typeof SESSION_STATE)[keyof typeof SESSION_STATE];

export type SessionStateObject = {
  status: SessionState;
  signaling?: {
    state: SignalState;
  };
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
  const protocol = initParameters.p;
  const server = initParameters.s;

  const updateStatus = (newStatus: SessionState) => {
    log("updateStatus", newStatus);
    status = newStatus;
    emitter.emit("state_change", { status, signaling: signal.getState() });
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
    onmessage: async (message: object) => {
      console.log("Session: received message from transport", message);

      // @ts-ignore
      if (message["type"] === "request") {
        // @ts-ignore
        const data = await onMessage(message["payload"] as object);
        const response: SessionMessage = {
          type: "response",
          // @ts-ignore
          messageId: message["messageId"] as string,
          payload: data,
        };

        await transport.send(response);
      }

      // @ts-ignore
      if (message["type"] === "response") {
        messages.emit("message", message);
      }
    },
    async subsend(message) {
      console.log("Session: sending trans msg to signal", message);
      const sessionMessage: SessionMessage = {
        type: "request",
        messageId: crypto.randomUUID(),
        payload: message,
      };

      await signal.send(sessionMessage);
    },
  });

  transport.emitter.on("state_change", (state) => {
    log("transport state change", state);

    if (state === TRANSPORT_STATE.CONNECTED) {
      updateStatus(SESSION_STATE.CONNECTED);
    }
  });

  const startTransport = async () => {
    await transport.setup();
  };

  // let transport: TransportLayer | undefined;
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

  return {
    connect: async () => {
      updateStatus(SESSION_STATE.SIGNALING);
      log("connecting to session, isHost:", isHost);
      // TODO: implement
      log("connecting to session");

      signal.on("message", onSignalMessage);

      signal.on("state_change", (state) => {
        log("signal state change", state);

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

        if (state === SIGNAL_STATE.ENCRYPTED) {
          // for now cuz we just use signaling call this a full connection
          // updateStatus("connected");
          startTransport();
        }
      });

      // TODO: handle errors in setup nicely in modal UI
      await signal.setup();
    },
    async close() {
      log("session teardown");
      await signal?.teardown();
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
    waitForLink: async () => new Promise((resolve) => {
      emitter.on("state_change", (state) => {
        if (state?.status === SESSION_STATE.CONNECTED) {
          resolve();
        }
      });
    }),
    async send(message: object, timeout: number = 5000) {
      const ready = signal.getState().state === SIGNAL_STATE.ENCRYPTED;
      // const transportReady = transport.getState() === TRANSPORT_STATE.CONNECTED;

      if (!ready) {
        throw new Error("Session not ready");
      }

      const randomID = crypto.randomUUID();
      const sessionMessage: SessionMessage = {
        type: "request",
        messageId: randomID,
        payload: message,
      };

      // for now use signaling
      // await signal.send(sessionMessage);
      await transport.send(sessionMessage);

      return Promise.race([
        new Promise((resolve) => {
          messages.on("message", (message) => {
            if (message.messageId === randomID && message.type === "response") {
              resolve(message.payload);
            }
          });
        }),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(new Error("Timeout"));
          }, timeout);
        }),
      ]);
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
