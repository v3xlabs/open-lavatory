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
  SIGNAL_STATE,
  type SignalingLayer,
  type SignalingProtocol,
  type SignalState,
} from "@openlv/signaling";
import { dynamicSignalingLayer } from "@openlv/signaling/dynamic";
import {
  TRANSPORT_STATE,
  type TransportLayer,
  type TransportLayerFn,
  type TransportMessage,
  type TransportState,
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
  /**
     * Send a request to the remote peer and await a correlated response.
     *
     * Two-phase timeout:
     * - `ackTimeout` (default 10 s): the remote peer must send back an ack
     *   within this window, confirming it received the message.
     * - After an ack arrives the wait is extended to `responseTimeout`
     *   (default 1 hour) — enough for user-interactive flows such as
     *   `eth_sendTransaction` or `personal_sign`.
     */
  send(message: object, ackTimeout?: number, responseTimeout?: number): Promise<unknown>;
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
  signalLayer: SignalingProtocol,
  transportLayers: TransportLayerFn[],
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
  let disconnecting = false;
  const pendingRequestRejects = new Set<(error: Error) => void>();
  let detachSignalState: (() => void) | undefined;
  let detachTransportState: (() => void) | undefined;

  const updateStatus = (newStatus: SessionState) => {
    log("updateStatus", newStatus);
    status = newStatus;
    emitter.emit("state_change", { status, signaling: signal.getState() });
  };

  const rejectPendingRequests = (error: Error) => {
    for (const reject of pendingRequestRejects) {
      reject(error);
    }

    pendingRequestRejects.clear();
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

  const [createTransport] = transportLayers;

  if (!createTransport) throw new Error("At least one transport layer must be provided");

  const transport = createTransport({
    encrypt(message) {
      if (!relyingPublicKey) {
        throw new Error("Relying party public key not found");
      }

      return relyingPublicKey?.encrypt(message);
    },
    decrypt,
    isHost,
    onmessage: async (message: { type: string; payload?: object | string; messageId: string; }) => {
      log("Session: received message from transport", message);

      if (message["type"] === "close") {
        await disconnect(false);

        return;
      }

      if (message["type"] === "request") {
        const messageId = message["messageId"] as string;

        // Immediately acknowledge receipt so the sender's ack-timeout does
        // not fire while the handler (which may await user interaction) runs.
        await transport.send({ type: "ack", messageId } satisfies SessionMessage);

        // Notify observers before processing (e.g. wallet UI can show a
        // pending indicator before the handler resolves).
        emitter.emit("request", message["payload"] as object);

        const data = await onMessage(message["payload"] as object);
        const response: SessionMessage = {
          type: "response",
          messageId,
          payload: data,
        };

        await transport.send(response);
      }

      if (message["type"] === "response" || message["type"] === "ack") {
        // Both acks and responses are forwarded to the send() correlator.
        messages.emit("message", message as SessionMessage);
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

  const disconnect = async (notify: boolean = true) => {
    log("session teardown");

    if (status === SESSION_STATE.DISCONNECTED || disconnecting) return;

    disconnecting = true;
    rejectPendingRequests(new Error("Session disconnected"));

    if (notify) {
      try {
        await transport.send(
          { type: "close", messageId: crypto.randomUUID() } satisfies SessionMessage,
          { allowReady: true },
        );
      }
      catch (error) {
        log("session close notification failed", error);
      }
    }

    signal.off("message", onSignalMessage);
    detachSignalState?.();
    detachSignalState = undefined;
    detachTransportState?.();
    detachTransportState = undefined;

    try {
      await Promise.all([transport.teardown(), signal.teardown()]);
    }
    catch (error) {
      log("session teardown failed", error);
    }

    updateStatus(SESSION_STATE.DISCONNECTED);
  };

  const onTransportState = (state: TransportState) => {
    log("transport state change", state);

    if (state === TRANSPORT_STATE.CONNECTED) {
      updateStatus(SESSION_STATE.CONNECTED);
    }

    if (
      state === TRANSPORT_STATE.DISCONNECTED
      || state === TRANSPORT_STATE.ERROR
    ) {
      void disconnect(false);
    }
  };

  transport.emitter.on("state_change", onTransportState);
  detachTransportState = () => transport.emitter.off("state_change", onTransportState);

  const onSignalMessage = async (message: object) => {
    log("Session: received message from signaling", message);

    const sessionMsg = message as SessionMessage;

    if (sessionMsg.type === "response") {
      log("Session: received data message", sessionMsg.payload);
      messages.emit("message", sessionMsg);
    }

    if (sessionMsg.type === "request") {
      log("Session: received request message", sessionMsg.payload);

      await transport.handle(sessionMsg.payload as TransportMessage);
    }
  };

  const onSignalState = (state: SignalState) => {
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
      void transport.setup().catch((error) => {
        log("transport setup failed", error);
        void disconnect(false);
      });
    }

    if (state === SIGNAL_STATE.ERROR) {
      log("signaling error - marking session disconnected");
      void disconnect(false);
    }
  };

  return {
    connect: async () => {
      updateStatus(SESSION_STATE.SIGNALING);
      log("connecting to session, isHost:", isHost);

      signal.on("message", onSignalMessage);
      signal.on("state_change", onSignalState);
      detachSignalState = () => signal.off("state_change", onSignalState);

      await signal.setup();
    },
    close: disconnect,
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
    waitForLink: async () => {
      if (status === SESSION_STATE.CONNECTED) return;

      if (status === SESSION_STATE.DISCONNECTED) {
        throw new Error("Session failed to connect");
      }

      return new Promise<void>((resolve, reject) => {
        const handler = (state?: SessionStateObject) => {
          if (state?.status === SESSION_STATE.CONNECTED) {
            emitter.off("state_change", handler);
            resolve();
          }
          else if (state?.status === SESSION_STATE.DISCONNECTED) {
            emitter.off("state_change", handler);
            reject(new Error("Session failed to connect"));
          }
        };

        emitter.on("state_change", handler);
      });
    },
    async send(
      message: object,
      ackTimeout: number = 10_000,
      responseTimeout: number = 60 * 60_000,
    ) {
      if (signal.getState().state !== SIGNAL_STATE.ENCRYPTED) {
        throw new Error("Session not ready");
      }

      const messageId = crypto.randomUUID();
      const sessionMessage: SessionMessage = {
        type: "request",
        messageId,
        payload: message,
      };

      return new Promise<unknown>((resolve, reject) => {
        let ackReceived = false;
        let responseTimer: ReturnType<typeof setTimeout> | undefined;
        const fail = (error: Error) => {
          cleanup();
          reject(error);
        };

        const cleanup = () => {
          clearTimeout(ackTimer);
          clearTimeout(responseTimer);
          messages.off("message", handler);
          pendingRequestRejects.delete(fail);
        };

        const handler = (msg: SessionMessage) => {
          if (msg.messageId !== messageId) return;

          if (msg.type === "ack" && !ackReceived) {
            ackReceived = true;
            clearTimeout(ackTimer);
            // The other side confirmed receipt; wait for the full response.
            responseTimer = setTimeout(() => {
              cleanup();
              reject(new Error("Request timed out: no response after acknowledgement"));
            }, responseTimeout);

            return;
          }

          if (msg.type === "response") {
            cleanup();
            resolve(msg.payload);
          }
        };

        messages.on("message", handler);
        pendingRequestRejects.add(fail);

        // Short window for the ack — tells us the peer is alive and processing.
        const ackTimer = setTimeout(() => {
          if (!ackReceived) {
            cleanup();
            reject(new Error("Request timed out: remote peer did not acknowledge"));
          }
        }, ackTimeout);

        void transport.send(sessionMessage).catch(fail);
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
  transport: TransportLayerFn[],
): Promise<Session> => {
  const initParameters = decodeConnectionURL(connectionUrl);

  const signaling = await dynamicSignalingLayer(initParameters.p);

  if (!signaling) {
    throw new Error(`Invalid signaling protocol: ${initParameters.p}`);
  }

  return createSession(initParameters, signaling, transport, onMessage);
};
