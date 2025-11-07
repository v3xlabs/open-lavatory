import {
  decodeConnectionURL,
  OPENLV_PROTOCOL_VERSION,
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
import type { CreateSignalLayerFn, SignalingLayer } from "@openlv/signaling";
import { mqtt } from "@openlv/signaling/mqtt";
import { ntfy } from "@openlv/signaling/ntfy";
import { EventEmitter } from "eventemitter3";

import type { SessionEvents } from "./events.js";
import type {
  SessionMessage,
  SessionMessageResponse,
  WebRTCSignal,
} from "./messages/index.js";
import type { Session, SessionStatus } from "./session-types.js";
import { maybeSendTransportProbe } from "./transport/probe.js";
import { createWebRTCTransportLayer } from "./transport/webrtc-layer.js";
import { log } from "./utils/log.js";

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

  const sendViaSignaling = async (sessionMessage: SessionMessage) => {
    await signal.send(sessionMessage);
  };
  const sendViaBestPath = async (sessionMessage: SessionMessage) => {
    try {
      await transportLayer.sendViaTransport(sessionMessage);
    } catch (transportErr) {
      log(
        "transport send failed, falling back to signaling",
        transportErr as Error,
      );

      try {
        await sendViaSignaling(sessionMessage);
      } catch (signalingErr) {
        log("signaling fallback also failed", signalingErr as Error);
        throw new Error("Failed to send via both transport and signaling");
      }
    }
  };

  const transportLayer = createWebRTCTransportLayer({
    signal: {
      send: async (msg: object) => {
        await signal.send(msg);
      },
    },
    isHost,
    getRelyingPublicKey: () => relyingPublicKey,
    decryptionKey,
    onMessage,
    messages,
    onTransportStateChange: () => updateStatus(status),
  });

  // Allow the transport layer to reuse the best-path logic (transport with signaling fallback)
  transportLayer.setSendViaBestPath(sendViaBestPath);
  let transportProbeSent = false;

  const updateStatus = (newStatus: SessionStatus) => {
    status = newStatus;
    const transportState = transportLayer.getTransportState();

    emitter.emit("state_change", {
      status,
      signaling: signal.getState(),
      transport: transportState,
    });

    maybeSendTransportProbe({
      status,
      transportConnected: !!transportState?.connected,
      transportHelloAcked: transportLayer.isHelloAcked(),
      sent: transportProbeSent,
      sendViaTransport: transportLayer.sendViaTransport,
    }).then((sent) => {
      transportProbeSent = sent;
    });
  };

  signal?.emitter.on("state_change", () => {
    updateStatus(status);
  });

  return {
    connect: async () => {
      updateStatus("signaling");
      log("connecting to session, isHost:", isHost);
      // begin signaling setup
      await signal.setup();
      signal.subscribe(async (message) => {
        const transportMsg =
          message as import("./messages/index.js").SessionMessageTransport;

        if (transportMsg.type === "transport") {
          try {
            const t = await transportLayer.ensureTransport();
            const { payload } = transportMsg;

            if (payload.transport === "webrtc") {
              const response = await t.handleSignal(
                payload.signal as WebRTCSignal,
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
        if (state === "xr-encrypted") {
          try {
            if (transportLayer.isSupported()) {
              const t = await transportLayer.ensureTransport();

              if (isHost) {
                const offer = await t.negotiateAsInitiator();

                await signal.send({
                  type: "transport",
                  messageId: crypto.randomUUID(),
                  payload: { transport: "webrtc", signal: offer },
                });
              }
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
      await transportLayer
        .teardown()
        .catch((err: unknown) => log("transport teardown error", err as Error));

      updateStatus("disconnected");
    },
    getState() {
      return {
        status,
        signaling: signal.getState(),
        transport: transportLayer.getTransportState(),
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
      return new Promise<void>((resolve) => {
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

      // Prefer transport if alive; otherwise fall back to signaling
      await sendViaBestPath(sessionMessage);

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
