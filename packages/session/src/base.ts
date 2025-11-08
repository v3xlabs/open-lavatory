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

  const signalingFactory: SignalingLayer = await signalLayer({
    topic: sessionId,
    url: server,
  });
  let signal = await signalingFactory({
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
  let signalingSuspended = false;
  let pendingTransportRestart = false;

  const attachSignalHandlers = () => {
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

        await sendViaBestPath(responseMessage);
      }
    });
    signal.emitter.on("state_change", async (state) => {
      if (state === "xr-encrypted") {
        try {
          if (transportLayer.isSupported()) {
            const t = await transportLayer.ensureTransport();

            if (isHost) {
              const offer = await (
                t as unknown as {
                  negotiateAsInitiator: (options?: {
                    iceRestart?: boolean;
                  }) => Promise<WebRTCSignal>;
                }
              ).negotiateAsInitiator(
                pendingTransportRestart ? { iceRestart: true } : undefined,
              );

              await signal.send({
                type: "transport",
                messageId: crypto.randomUUID(),
                payload: { transport: "webrtc", signal: offer },
              });

              pendingTransportRestart = false;
            }
          }
        } catch (err) {
          log("WebRTC negotiation init error", err as Error);
        }

        updateStatus("connected");
      }
    });
  };

  attachSignalHandlers();

  const suspendSignaling = async () => {
    if (signalingSuspended) return;

    try {
      await signal.teardown();
    } catch (err) {
      log("signaling suspend error", err as Error);
    } finally {
      signalingSuspended = true;
    }
  };

  const resumeSignaling = async () => {
    if (!signalingSuspended) return;

    try {
      signal = await signalingFactory({
        h: hash,
        canEncrypt() {
          return relyingPublicKey !== undefined;
        },
        async encrypt(message) {
          if (!relyingPublicKey)
            throw new Error("Relying party public key not found");

          return await relyingPublicKey.encrypt(message);
        },
        async decrypt(message) {
          if (!decryptionKey) throw new Error("Decryption key not found");

          return await decryptionKey.decrypt(message);
        },
        publicKey: encryptionKey,
        k: handshakeKey,
        async rpDiscovered(rpKey) {
          relyingPublicKey = await parseEncryptionKey(rpKey);
        },
        isHost,
      });
      signalingSuspended = false;
      attachSignalHandlers();
      await signal.setup();
    } catch (err) {
      log("signaling resume error", err as Error);
    }
  };

  const sendViaSignaling = async (sessionMessage: SessionMessage) => {
    if (signalingSuspended) await resumeSignaling();

    await signal.send(sessionMessage);
  };
  const sendViaBestPath = async (sessionMessage: SessionMessage) => {
    const canUseTransport =
      !!transportLayer.getTransportState()?.connected &&
      transportLayer.isHelloAcked();

    if (canUseTransport) {
      try {
        await transportLayer.sendViaTransport(sessionMessage);

        return;
      } catch (transportErr) {
        log(
          "transport send failed, falling back to signaling",
          transportErr as Error,
        );
      }
    }

    try {
      await sendViaSignaling(sessionMessage);
    } catch (signalingErr) {
      log("signaling fallback also failed", signalingErr as Error);
      throw new Error("Failed to send via both transport and signaling");
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

  transportLayer.setSendViaBestPath(sendViaBestPath);
  let transportProbeSent = false;

  const updateStatus = (newStatus: SessionStatus) => {
    status = newStatus;
    const transportState = transportLayer.getTransportState();

    const transportFailed =
      transportState?.type === "webrtc" &&
      ["webrtc-failed", "webrtc-closed"].includes(transportState.state ?? "");

    if (isHost && transportFailed && status !== "disconnected") {
      pendingTransportRestart = true;
    }

    emitter.emit("state_change", {
      status,
      signaling: signalingSuspended
        ? { state: "disconnected" }
        : signal.getState(),
      transport: transportState,
    });

    const transportHealthy =
      !!transportState?.connected && transportLayer.isHelloAcked();

    if (transportHealthy && !signalingSuspended) {
      // fire and forget
      suspendSignaling();
    }

    if (!transportHealthy && signalingSuspended) {
      resumeSignaling();
    }

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
    },
    async close() {
      log("session teardown");
      await suspendSignaling();
      await transportLayer
        .teardown()
        .catch((err: unknown) => log("transport teardown error", err as Error));

      updateStatus("disconnected");
    },
    getState() {
      return {
        status,
        signaling: signalingSuspended
          ? { state: "disconnected" }
          : signal.getState(),
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
      const transportReady =
        !!transportLayer.getTransportState()?.connected &&
        transportLayer.isHelloAcked();
      const signalingReady =
        !signalingSuspended && signal.getState().state === "xr-encrypted";
      const ready = transportReady || signalingReady;

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
      return await new Promise((resolve, reject) => {
        const messageHandler = (incoming: SessionMessage) => {
          if (incoming.messageId !== randomID || incoming.type !== "response") {
            return;
          }

          cleanup();
          resolve(incoming.payload);
        };

        function cleanup() {
          messages.off("message", messageHandler);
          clearTimeout(timer);
        }

        messages.on("message", messageHandler);

        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout"));
        }, timeout);

        void sendViaBestPath(sessionMessage).catch((err) => {
          cleanup();
          reject(err);
        });
      });
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
