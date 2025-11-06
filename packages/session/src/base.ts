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
import type {
  CreateSignalLayerFn,
  SignalingLayer,
  SignalingMode,
} from "@openlv/signaling";
import { mqtt } from "@openlv/signaling/mqtt";
import { ntfy } from "@openlv/signaling/ntfy";
import { webrtc } from "@openlv/transport";
import { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";

import type { SessionEvents } from "./events.js";
type WebRTCSignalT =
  import("./messages/index.js").SessionMessageTransport["payload"]["signal"];
import type {
  SessionMessage,
  SessionMessageResponse,
} from "./messages/index.js";
import { log } from "./utils/log.js";

export type SessionStatus =
  | "created"
  | "ready"
  | "signaling"
  | "connected"
  | "disconnected";
export type SessionStateObject = {
  status: SessionStatus;
  signaling?: {
    state: SignalingMode;
  };
  transport?: {
    type: "webrtc";
    state:
      | "webrtc-negotiating"
      | "webrtc-connecting"
      | "webrtc-connected"
      | "webrtc-failed"
      | "webrtc-closed";
    connected: boolean;
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
};

/**
 * OpenLV Session
 *
 * https://openlv.sh/api/session
 */
export const createSession = async (
  initParameters: SessionLinkParameters,
  signalLayer: CreateSignalLayerFn,
  onMessage: (message: object) => Promise<object>,
): Promise<Session> => {
  const emitter = new EventEmitter<SessionEvents>();
  const messages = new EventEmitter<{ message: SessionMessage }>();
  const sessionId =
    "sessionId" in initParameters
      ? initParameters.sessionId
      : generateSessionId();
  const { encryptionKey, decryptionKey } =
    await initEncryptionKeys(initParameters);
  let relyingPublicKey: EncryptionKey | undefined;
  const handshakeKey =
    "k" in initParameters
      ? await deriveSymmetricKey(initParameters.k)
      : await generateHandshakeKey();
  const { hash, isHost } = await initHash(
    "h" in initParameters ? initParameters.h : undefined,
    encryptionKey,
  );
  let status: SessionStatus = "created";
  const protocol = initParameters.p;
  const server = initParameters.s;

  const signaling: SignalingLayer = await signalLayer({
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
    async decrypt(message) {
      if (!decryptionKey) {
        throw new Error("Decryption key not found");
      }

      const response = await decryptionKey.decrypt(message);

      log("decrypted message", response);

      return response;
    },
    publicKey: encryptionKey,
    k: handshakeKey,
    async rpDiscovered(rpKey) {
      const role = isHost ? "host" : "client";

      log(`rpKey discovered by ${role}`, rpKey);

      relyingPublicKey = await parseEncryptionKey(rpKey);
    },
    isHost,
  });

  const updateStatus = (newStatus: SessionStatus) => {
    status = newStatus;
    emitter.emit("state_change", {
      status,
      signaling: signal.getState(),
      transport: transportState,
    });
  };

  signal?.emitter.on("state_change", () => {
    updateStatus(status);
  });

  let transport = undefined as ReturnType<typeof webrtc> | undefined;
  let transportSetup: Promise<void> | null = null;
  let transportState: SessionStateObject["transport"] | undefined;

  const ensureTransport = async () => {
    if (!transport) {
      transport = webrtc({
        onSignal: (sig: WebRTCSignalT) => {
          signal.send({
            type: "transport",
            messageId: crypto.randomUUID(),
            payload: { transport: "webrtc", signal: sig },
          });
        },
        onConnectionStateChange: (st) => {
          transportState = match(st)
            .with("connected", () => ({
              type: "webrtc" as const,
              state: "webrtc-connected" as const,
              connected: true,
            }))
            .with("connecting", () => ({
              type: "webrtc" as const,
              state: "webrtc-connecting" as const,
              connected: false,
            }))
            .with("failed", () => ({
              type: "webrtc" as const,
              state: "webrtc-failed" as const,
              connected: false,
            }))
            .with("disconnected", () => ({
              type: "webrtc" as const,
              state: "webrtc-closed" as const,
              connected: false,
            }))
            .with("closed", () => ({
              type: "webrtc" as const,
              state: "webrtc-closed" as const,
              connected: false,
            }))
            .otherwise(() => transportState);
          updateStatus(status);
        },
        createDataChannel: isHost,
      });
      transportSetup = Promise.resolve(transport.setup());
    }

    if (transportSetup) await transportSetup;

    return transport!;
  };

  return {
    connect: async () => {
      updateStatus("signaling");
      log("connecting to session, isHost:", isHost);
      // TODO: implement
      log("connecting to session");
      await signal.setup();

      signal.subscribe(async (message) => {
        log("Session: received message from signaling", message);

        const transportMsg =
          message as import("./messages/index.js").SessionMessageTransport;

        if (transportMsg.type === "transport") {
          try {
            const t = await ensureTransport();
            const { payload } = transportMsg;

            if (payload.transport === "webrtc") {
              const response = await t.handleSignal(
                payload.signal as WebRTCSignalT,
              );

              if (response) {
                await signal.send({
                  type: "transport",
                  messageId: crypto.randomUUID(),
                  payload: { transport: "webrtc", signal: response },
                });
              }
            }
          } catch (err) {
            log("transport signaling error", err as Error);
          }

          return;
        }

        // Normal request/response messages
        const sessionMsg = message as SessionMessage;

        if (sessionMsg.type === "response") {
          log("Session: received data message", sessionMsg.payload);
          messages.emit("message", sessionMsg);
        }

        if (sessionMsg.type === "request") {
          log("Session: received request message", sessionMsg.payload);
          const payload = await onMessage(sessionMsg.payload);
          const responseMessage: SessionMessageResponse = {
            type: "response",
            messageId: sessionMsg.messageId,
            payload,
          };

          await signal.send(responseMessage);
        }
      });

      signal.emitter.on("state_change", async (state) => {
        log("signal state change", state);

        if (state === "xr-encrypted") {
          try {
            const t = await ensureTransport();

            if (isHost) {
              const offer = await t.negotiateAsInitiator();

              await signal.send({
                type: "transport",
                messageId: crypto.randomUUID(),
                payload: { transport: "webrtc", signal: offer },
              });
            }
          } catch (err) {
            log("WebRTC negotiation init error", err as Error);
          }

          // For now, because we still send over signaling, mark as fully connected
          updateStatus("connected");
        }
      });
    },
    async close() {
      log("session teardown");
      await signal?.teardown();
      updateStatus("disconnected");
    },
    getState() {
      return { status, signaling: signal.getState() };
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
      return new Promise((resolve) => {
        emitter.on("state_change", (state) => {
          if (state?.status === "connected") {
            resolve();
          }
        });
      });
    },
    async send(message: object, timeout: number = 5000) {
      const ready = signal.getState().state === "xr-encrypted";

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
      await signal.send(sessionMessage);

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
    emitter,
  };
};

/**
 * Connect to a session from its openlv:// URL
 */
export const connectSession = async (
  connectionUrl: string,
  onMessage: (message: object) => Promise<object>,
): Promise<Session> => {
  const initParameters = decodeConnectionURL(connectionUrl);

  const signaling = {
    mqtt: mqtt,
    ntfy: ntfy,
  }[initParameters.p];

  if (!signaling) {
    throw new Error(`Invalid signaling protocol: ${initParameters.p}`);
  }

  return createSession(initParameters, signaling, onMessage);
};
