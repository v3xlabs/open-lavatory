import { type EncryptionKey } from "@openlv/core/encryption";
import { webrtc } from "@openlv/transport";
import type { EventEmitter } from "eventemitter3";
import { match } from "ts-pattern";

import type { SessionMessage } from "../messages/index.js";
import type { SessionStateObject } from "../session-types.js";
import { log } from "../utils/log.js";
import { handleTransportData } from "./data.js";

export type WebRTCSignalT =
  import("../messages/index.js").SessionMessageTransport["payload"]["signal"];

export type TransportWireMessage =
  | { t: "h" } // hello
  | { t: "ha" } // hello ack
  | { t: "d"; b: string }; // encrypted data body

export type CreateWebRTCTransportLayerParams = {
  signal: {
    send: (msg: object) => Promise<void>;
  };
  isHost: boolean;
  getRelyingPublicKey: () => EncryptionKey | undefined;
  decryptionKey: import("@openlv/core/encryption").DecryptionKey | undefined;
  onMessage: (message: object) => Promise<object>;
  messages: EventEmitter<{ message: SessionMessage }>;
  onTransportStateChange: () => void;
};

export function createWebRTCTransportLayer(
  params: CreateWebRTCTransportLayerParams,
) {
  const {
    signal,
    isHost,
    getRelyingPublicKey,
    decryptionKey,
    onMessage,
    messages,
    onTransportStateChange,
  } = params;

  let transport = undefined as ReturnType<typeof webrtc> | undefined;
  let transportSetup: Promise<void> | null = null;
  let transportState: SessionStateObject["transport"] | undefined;
  const transportSupported =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as unknown as { RTCPeerConnection?: unknown })
      .RTCPeerConnection !== "undefined";
  let transportHelloAcked = false;
  let sendViaBestPath: ((msg: SessionMessage) => Promise<void>) | null = null;

  const ensureTransport = async () => {
    if (!transportSupported) {
      return Promise.reject(new Error("WebRTC not supported in this runtime"));
    }

    if (!transport) {
      transport = webrtc({
        onSignal: (sig: WebRTCSignalT) => {
          signal.send({
            type: "transport",
            messageId: crypto.randomUUID(),
            payload: { transport: "webrtc", signal: sig },
          });
        },
        onConnectionStateChange: (st: RTCPeerConnectionState) => {
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

          if (st === "connected") {
            const attemptHello = (retries = 0) => {
              try {
                const hello: TransportWireMessage = { t: "h" };

                transport?.send(JSON.stringify(hello));
              } catch (err) {
                if (retries < 8) {
                  const backoff = 50 * (retries + 1);

                  setTimeout(() => attemptHello(retries + 1), backoff);
                } else {
                  log("transport hello send error after retries", err as Error);
                }
              }
            };

            attemptHello();
          } else {
            transportHelloAcked = false;
          }

          onTransportStateChange();
        },
        createDataChannel: isHost,
      });

      transport.onMessage((raw: unknown) => {
        void (async () => {
          try {
            if (typeof raw !== "string") return;

            const msg = JSON.parse(raw) as TransportWireMessage;

            if (msg.t === "h") {
              const ack: TransportWireMessage = { t: "ha" };

              try {
                transport?.send(JSON.stringify(ack));
                transportHelloAcked = true;
                onTransportStateChange();
              } catch (err) {
                log("transport hello-ack send error", err as Error);
              }

              return;
            }

            if (msg.t === "ha") {
              transportHelloAcked = true;
              onTransportStateChange();

              return;
            }

            if (msg.t === "d") {
              await handleTransportData({
                body: msg.b,
                decryptionKey,
                onMessage,
                sendViaBestPath: async (m) => {
                  if (!sendViaBestPath)
                    throw new Error("sendViaBestPath not set");

                  await sendViaBestPath(m);
                },
                messages,
              });

              return;
            }
          } catch (err) {
            log("transport onMessage error", err as Error);
          }
        })();
      });

      transportSetup = Promise.resolve(transport.setup());
    }

    if (transportSetup) await transportSetup;

    return transport!;
  };

  const sendViaTransport = async (sessionMessage: SessionMessage) => {
    const relyingPublicKey = getRelyingPublicKey();

    if (!transport || !transportState?.connected || !transportHelloAcked) {
      throw new Error("Transport not ready");
    }

    if (!relyingPublicKey) throw new Error("Relying party key missing");

    const plaintext = JSON.stringify(sessionMessage);
    const ciphertext = await relyingPublicKey.encrypt(plaintext);
    const wire: TransportWireMessage = { t: "d", b: ciphertext };

    transport.send(JSON.stringify(wire));
  };

  const teardown = async () => {
    try {
      await transport?.teardown();
    } finally {
      transport = undefined;
      transportSetup = null;
      transportState = undefined;
      transportHelloAcked = false;
    }
  };

  return {
    ensureTransport,
    isSupported: () => transportSupported,
    getTransportState: () => transportState,
    isHelloAcked: () => transportHelloAcked,
    sendViaTransport,
    setSendViaBestPath: (fn: (m: SessionMessage) => Promise<void>) => {
      sendViaBestPath = fn;
    },
    teardown,
  } as const;
}
