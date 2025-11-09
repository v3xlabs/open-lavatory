/* eslint-disable max-lines */
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
import type {
  CreateSignalLayerFn,
  SignalingLayer,
  SignalingMode,
} from "@openlv/signaling";
import { mqtt } from "@openlv/signaling/mqtt";
import { ntfy } from "@openlv/signaling/ntfy";
import { EventEmitter } from "eventemitter3";

import type { SessionEvents } from "./events.js";
import type {
  SessionMessage,
  SessionMessageResponse,
} from "./messages/index.js";
import type {
  Session,
  SessionStateObject,
  SessionStatus,
} from "./session-types.js";
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
  const STATUS_TRANSPORT_RECONNECTING: SessionStatus = "transport-reconnecting";
  const protocol = initParameters.p;
  const server = initParameters.s;

  type TransportLayer = ReturnType<typeof createWebRTCTransportLayer>;
  let transportLayer: TransportLayer | null = null;
  const TRANSPORT_NOT_INITIALISED = "transport layer not initialised";

  const requireTransportLayer = (): TransportLayer => {
    if (!transportLayer) {
      throw new Error(TRANSPORT_NOT_INITIALISED);
    }

    return transportLayer;
  };

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
  let transportReconnectInProgress = false;

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

  const beginTransportReconnect = async (reason?: unknown) => {
    if (transportReconnectInProgress) return;

    const reconnectLogLabel = "transport reconnect requested";

    if (reason instanceof Error) {
      log(reconnectLogLabel, reason);
    } else if (reason) {
      log(reconnectLogLabel, reason as Error);
    } else {
      log(reconnectLogLabel);
    }

    transportReconnectInProgress = true;

    transportProbeSent = false;
    pendingTransportRestart = isHost;

    if (signalingSuspended) {
      await resumeSignaling();
    } else {
      try {
        await signal.setup();
      } catch (err) {
        log("signaling setup error during reconnect", err as Error);
      }
    }

    const layer = requireTransportLayer();

    await layer
      .teardown()
      .catch((err: unknown) =>
        log("transport teardown error during reconnect", err as Error),
      );

    updateStatus(STATUS_TRANSPORT_RECONNECTING);

    if (!layer.isSupported()) {
      return;
    }

    try {
      await layer.ensureTransport();

      if (isHost) {
        const payload = await layer.negotiateAsInitiator({ iceRestart: true });

        await signal.send({
          type: "transport",
          messageId: crypto.randomUUID(),
          payload,
        });

        pendingTransportRestart = false;
      }
    } catch (err) {
      log("transport ensure error during reconnect", err as Error);
    }
  };

  const sendViaBestPath = async (
    sessionMessage: SessionMessage,
  ): Promise<void> => {
    const layer = requireTransportLayer();
    const transportState = layer.getTransportState();
    const transportHealthy =
      !!transportState?.connected && layer.isHelloAcked();

    if (transportHealthy) {
      try {
        await layer.sendViaTransport(sessionMessage);

        return;
      } catch (transportErr) {
        log(
          "transport send failed, scheduling reconnect",
          transportErr as Error,
        );
        await beginTransportReconnect(transportErr);
        throw new Error("Transport send failed");
      }
    }

    await beginTransportReconnect(new Error("Transport not ready for data"));
    throw new Error("Transport not ready");
  };

  const processSessionMessage = async (
    sessionMsg: SessionMessage,
  ): Promise<void> => {
    if (sessionMsg.type === "response") {
      log("Session: received data message", sessionMsg.payload);
      messages.emit("message", sessionMsg);

      return;
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
  };

  const handleTransportCiphertext = async (body: string): Promise<void> => {
    if (!decryptionKey) {
      log("transport data received without decryption key");

      return;
    }

    try {
      const decrypted = await decryptionKey.decrypt(body);
      const sessionMsg = JSON.parse(decrypted) as SessionMessage;

      await processSessionMessage(sessionMsg);
    } catch (err) {
      log("transport data handling error", err as Error);
    }
  };

  const attachSignalHandlers = () => {
    signal.subscribe(async (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        (message as { type?: unknown }).type === "transport"
      ) {
        try {
          const layer = requireTransportLayer();
          const { payload } = message as { payload?: unknown };

          if (
            typeof payload === "object" &&
            payload !== null &&
            (payload as { transport?: unknown }).transport === "webrtc" &&
            (payload as { signal?: unknown }).signal !== undefined
          ) {
            const maybeReply = await layer.handleControl(
              payload as { transport: "webrtc"; signal: unknown },
            );

            if (maybeReply) {
              await signal.send({
                type: "transport",
                messageId: crypto.randomUUID(),
                payload: maybeReply,
              });
            }
          } else {
            log(
              "ignoring transport message with invalid payload",
              payload as Error,
            );
          }
        } catch (err) {
          log("transport signaling error", err as Error);
        }

        return;
      }

      await processSessionMessage(message as SessionMessage);
    });
    signal.emitter.on("state_change", async (state) => {
      if (state === "xr-encrypted") {
        try {
          const layer = requireTransportLayer();

          if (layer.isSupported()) {
            await layer.ensureTransport();

            if (isHost) {
              const payload = await layer.negotiateAsInitiator(
                pendingTransportRestart ? { iceRestart: true } : undefined,
              );

              await signal.send({
                type: "transport",
                messageId: crypto.randomUUID(),
                payload,
              });

              pendingTransportRestart = false;
            }
          }
        } catch (err) {
          log("WebRTC negotiation init error", err as Error);
        }

        updateStatus("ready");
      }
    });
  };

  transportLayer = createWebRTCTransportLayer({
    signal: {
      send: async (msg: object) => {
        await signal.send(msg);
      },
    },
    isHost,
    getRelyingPublicKey: () => relyingPublicKey,
    onData: handleTransportCiphertext,
    onTransportStateChange: () => updateStatus(status),
  });

  attachSignalHandlers();
  let transportProbeSent = false;

  const resolveNextStatus = (
    incomingStatus: SessionStatus,
    transportHealthy: boolean,
  ): SessionStatus => {
    if (incomingStatus === STATUS_TRANSPORT_RECONNECTING && transportHealthy) {
      transportReconnectInProgress = false;

      return "connected";
    }

    if (transportReconnectInProgress) {
      if (incomingStatus === "disconnected") {
        transportReconnectInProgress = false;

        return "disconnected";
      }

      if (transportHealthy) {
        transportReconnectInProgress = false;

        return "connected";
      }

      return STATUS_TRANSPORT_RECONNECTING;
    }

    if (incomingStatus === "ready" && transportHealthy) {
      return "connected";
    }

    if (incomingStatus === "connected" && !transportHealthy) {
      return "ready";
    }

    if (incomingStatus === STATUS_TRANSPORT_RECONNECTING) {
      transportReconnectInProgress = true;

      return STATUS_TRANSPORT_RECONNECTING;
    }

    return incomingStatus;
  };

  const updateStatus = (incomingStatus: SessionStatus) => {
    const layer = transportLayer;

    if (!layer) {
      return;
    }

    const transportState = layer.getTransportState();
    const transportHelloAcked = layer.isHelloAcked();
    const transportHealthy = !!transportState?.connected && transportHelloAcked;

    const nextStatus = resolveNextStatus(incomingStatus, transportHealthy);

    status = nextStatus;

    const transportFailed =
      transportState?.type === "webrtc" &&
      ["webrtc-failed", "webrtc-closed"].includes(transportState.state ?? "");

    if (isHost && transportFailed && status !== "disconnected") {
      pendingTransportRestart = true;
    }

    const signalingState = signalingSuspended
      ? ({ state: "disconnected" } as { state: SignalingMode })
      : signal.getState();

    const transportDescriptor = transportState
      ? { ...transportState, helloAcked: transportHelloAcked }
      : undefined;

    emitter.emit("state_change", {
      status,
      signaling: signalingState,
      transport: transportDescriptor,
    });

    const shouldSuspend =
      status === "connected" && transportHealthy && !signalingSuspended;

    if (shouldSuspend) {
      void suspendSignaling();
    }

    const shouldResume =
      status !== "connected" && !transportHealthy && signalingSuspended;

    if (shouldResume) {
      void resumeSignaling();
    }

    maybeSendTransportProbe({
      status,
      transportConnected: !!transportState?.connected,
      transportHelloAcked,
      sent: transportProbeSent,
      sendViaTransport: layer.sendViaTransport,
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
      const layer = transportLayer;

      await layer
        ?.teardown()
        .catch((err: unknown) => log("transport teardown error", err as Error));

      updateStatus("disconnected");
    },
    getState() {
      const layer = transportLayer;
      const currentTransport = layer?.getTransportState();

      return {
        status,
        signaling: signalingSuspended
          ? { state: "disconnected" }
          : signal.getState(),
        transport: currentTransport
          ? {
              ...currentTransport,
              helloAcked: layer?.isHelloAcked() ?? false,
            }
          : undefined,
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
    waitForLink: async (timeout = 15000) => {
      const layer = transportLayer;
      const currentTransport = layer?.getTransportState();
      const alreadyLinked =
        status === "connected" &&
        !!currentTransport?.connected &&
        (layer?.isHelloAcked() ?? false);

      if (alreadyLinked) return;

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout waiting for transport link"));
        }, timeout);

        const handler = (state?: SessionStateObject) => {
          const transportConnected = !!state?.transport?.connected;
          const helloAcked = state?.transport?.helloAcked ?? false;

          if (
            state?.status === "connected" &&
            transportConnected &&
            helloAcked
          ) {
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          clearTimeout(timer);
          emitter.off("state_change", handler);
        };

        emitter.on("state_change", handler);
      });
    },
    async send(message: object, timeout: number = 5000) {
      const layer = transportLayer;
      const transportReady =
        !!layer?.getTransportState()?.connected &&
        (layer?.isHelloAcked() ?? false);

      if (!transportReady) {
        if (status === STATUS_TRANSPORT_RECONNECTING) {
          throw new Error("Transport reconnecting");
        }

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanup();
            reject(new Error("Session not ready: transport not established"));
          }, timeout);

          const handler = (state?: SessionStateObject) => {
            const t = state?.transport;

            if (state?.status === "connected" && t?.connected && t.helloAcked) {
              cleanup();
              resolve();
            }
          };

          const cleanup = () => {
            clearTimeout(timer);
            emitter.off("state_change", handler);
          };

          emitter.on("state_change", handler);
        });
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

        void sendViaBestPath(sessionMessage).catch((err: unknown) => {
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

/* eslint-enable max-lines */
