/* eslint-disable max-lines */
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
  type TLayer,
  TRANSPORT_STATE,
  type TransportLayer,
  type TransportMessage,
  type TransportOfferMessage,
  type TransportProtocol,
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
    transports: TransportLayer[];
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
  transportLayers: TLayer[],
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

  let selectedTransport: TransportLayer | undefined;
  const transportParameters = {
    encrypt(message) {
      if (!relyingPublicKey) {
        throw new Error("Relying party public key not found");
      }

      return relyingPublicKey?.encrypt(message);
    },
    decrypt,
    isHost,
    onmessage: async (message: { type: string; payload: object; messageId: string; }) => {
      log("Session: received message from transport", message);

      if (!selectedTransport) {
        throw new Error("Transport has not been negotiated");
      }

      if (message["type"] === "request") {
        const messageId = message["messageId"] as string;

        // Immediately acknowledge receipt so the sender's ack-timeout does
        // not fire while the handler (which may await user interaction) runs.
        await selectedTransport.send({ type: "ack", messageId } satisfies SessionMessage);

        // Notify observers before processing (e.g. wallet UI can show a
        // pending indicator before the handler resolves).
        emitter.emit("request", message["payload"] as object);

        const data = await onMessage(message["payload"] as object);
        const response: SessionMessage = {
          type: "response",
          messageId,
          payload: data,
        };

        await selectedTransport.send(response);
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
  } satisfies Parameters<TLayer>[0];
  const transports = transportLayers.map(transportLayer => transportLayer(transportParameters));

  if (transports.length === 0) {
    throw new Error("At least one transport is required");
  }

  const supportedTransports = transports.map(transport => transport.type);
  let selectedTransportProtocol: TransportProtocol | undefined;
  let transportSetup: Promise<void> | undefined;
  const pendingTransportMessages: TransportMessage[] = [];

  for (const transport of transports) {
    transport.emitter.on("state_change", (state) => {
      log("transport state change", transport.type, state);

      if (transport === selectedTransport && state === TRANSPORT_STATE.CONNECTED) {
        updateStatus(SESSION_STATE.CONNECTED);
      }
    });
  }

  const startTransport = async () => {
    if (!selectedTransport) {
      throw new Error("Transport has not been negotiated");
    }

    const transport = selectedTransport;

    transportSetup ??= Promise.resolve(transport.setup())
      .then(async () => {
        for (const message of pendingTransportMessages.splice(0)) {
          await transport.handle(message);
        }
      });

    await transportSetup;
  };

  const selectTransport = async (remoteTransports: TransportProtocol[]) => {
    const transport = transports.find(transport => remoteTransports.includes(transport.type));

    if (!transport) {
      updateStatus(SESSION_STATE.DISCONNECTED);
      throw new Error(`No shared transport. Local: ${supportedTransports.join(", ")}; remote: ${remoteTransports.join(", ")}`);
    }

    selectedTransportProtocol = transport.type;
    selectedTransport = transport;

    await signal.send({
      type: "request",
      messageId: crypto.randomUUID(),
      payload: {
        type: "transport-select",
        payload: { transport: transport.type },
      } satisfies TransportOfferMessage,
    } satisfies SessionMessage);
    await startTransport();
  };

  const handleTransportMessage = async (message: TransportMessage) => {
    if (selectedTransportProtocol && message.transport !== selectedTransportProtocol) {
      log("ignoring transport message for unselected transport", message.transport);

      return;
    }

    if (!transportSetup) {
      pendingTransportMessages.push(message);
      await startTransport();

      return;
    }

    await transportSetup;

    if (!selectedTransport) {
      throw new Error("Transport has not been negotiated");
    }

    await selectedTransport.handle(message);
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

      const transportMessage = sessionMsg.payload as TransportOfferMessage;

      switch (transportMessage.type) {
        case "transport-options": {
          if (isHost) await selectTransport(transportMessage.payload.transports);

          break;
        }
        case "transport-select": {
          if (isHost) break;

          const transport = transports.find(transport => transport.type === transportMessage.payload.transport);

          if (!transport) {
            updateStatus(SESSION_STATE.DISCONNECTED);
            throw new Error(`Unsupported selected transport: ${transportMessage.payload.transport}`);
          }

          selectedTransportProtocol = transportMessage.payload.transport;
          selectedTransport = transport;
          await startTransport();
          break;
        }
        case "transport-data": {
          await handleTransportMessage(transportMessage);
          break;
        }
      }
    }
  };

  return {
    connect: async () => {
      updateStatus(SESSION_STATE.SIGNALING);
      log("connecting to session, isHost:", isHost);
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

        if (state === SIGNAL_STATE.ENCRYPTED && !isHost) {
          signal.send({
            type: "request",
            messageId: crypto.randomUUID(),
            payload: {
              type: "transport-options",
              payload: { transports: supportedTransports },
            } satisfies TransportOfferMessage,
          } satisfies SessionMessage);
        }

        if (state === SIGNAL_STATE.ERROR) {
          log("signaling error — marking session disconnected");
          updateStatus(SESSION_STATE.DISCONNECTED);
        }
      });

      await signal.setup();
    },
    async close() {
      log("session teardown");
      signal.off("message", onSignalMessage);
      await Promise.all([
        ...transports.map(transport => transport.teardown()),
        signal.teardown(),
      ]);
      updateStatus(SESSION_STATE.DISCONNECTED);
    },
    getState() {
      return {
        status,
        signaling: signal.getState(),
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

      if (!selectedTransport) {
        throw new Error("Transport has not been negotiated");
      }

      await selectedTransport.send(sessionMessage);

      return new Promise<unknown>((resolve, reject) => {
        let ackReceived = false;
        let responseTimer: ReturnType<typeof setTimeout> | undefined;
        // eslint-disable-next-line prefer-const
        let ackTimer: ReturnType<typeof setTimeout> | undefined;

        const cleanup = () => {
          clearTimeout(ackTimer);
          clearTimeout(responseTimer);
          messages.off("message", handler);
        };

        const handler = (msg: SessionMessage) => {
          if (msg.messageId !== messageId) return;

          if (msg.type === "ack" && !ackReceived) {
            ackReceived = true;
            clearTimeout(ackTimer);
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

        ackTimer = setTimeout(() => {
          if (!ackReceived) {
            cleanup();
            reject(new Error("Request timed out: remote peer did not acknowledge"));
          }
        }, ackTimeout);
      });
    },
    _internal: {
      signal,
      transports,
    },
    emitter,
  };
};

export const connectSession = async (
  connectionUrl: string,
  onMessage: (message: object) => Promise<object | string>,
  transports: TLayer[],
): Promise<Session> => {
  const initParameters = decodeConnectionURL(connectionUrl);

  const signaling = await dynamicSignalingLayer(initParameters.p);

  if (!signaling) {
    throw new Error(`Invalid signaling protocol: ${initParameters.p}`);
  }

  return createSession(initParameters, signaling, transports, onMessage);
};
