import { type EncryptionKey } from "@openlv/core/encryption";
import type { WebRTCSignal } from "@openlv/transport";
import { ensureNodeWebRTC, webrtc } from "@openlv/transport";
import { match } from "ts-pattern";

import type { SessionMessage } from "../messages/index.js";
import type { SessionStateObject } from "../session-types.js";
import { log } from "../utils/log.js";

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
  onData: (ciphertext: string) => Promise<void>;
  onTransportStateChange: () => void;
};

export function createWebRTCTransportLayer(
  params: CreateWebRTCTransportLayerParams,
) {
  const {
    signal,
    isHost,
    getRelyingPublicKey,
    onData,
    onTransportStateChange,
  } = params;

  let transport = undefined as ReturnType<typeof webrtc> | undefined;
  let transportSetup: Promise<void> | null = null;
  let transportState: SessionStateObject["transport"] | undefined;
  const hasWebRTCPrimitives = () =>
    typeof globalThis !== "undefined" &&
    typeof (globalThis as unknown as { RTCPeerConnection?: unknown })
      .RTCPeerConnection !== "undefined";
  let transportSupportStatus: "unknown" | "supported" | "unsupported" =
    hasWebRTCPrimitives() ? "supported" : "unknown";
  let transportHelloAcked = false;

  const ensureTransportSupport = async () => {
    if (transportSupportStatus === "supported") return;

    try {
      await ensureNodeWebRTC();
    } catch (err) {
      transportSupportStatus = "unsupported";
      throw err;
    }

    transportSupportStatus = hasWebRTCPrimitives()
      ? "supported"
      : "unsupported";

    if (transportSupportStatus !== "supported") {
      throw new Error("WebRTC not supported in this runtime");
    }
  };

  const ensureTransport = async () => {
    await ensureTransportSupport();

    if (!transport) {
      transport = webrtc({
        onSignal: (sig: WebRTCSignal) => {
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
              await onData(msg.b);

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
    isSupported: () => transportSupportStatus !== "unsupported",
    getTransportState: () => transportState,
    isHelloAcked: () => transportHelloAcked,
    sendViaTransport,
    /**
     * Handle an incoming transport control payload from signaling.
     * Session treats this as an opaque blob; WebRTC transport interprets it.
     */
    async handleControl(payload: {
      transport: "webrtc";
      signal: unknown;
    }): Promise<{ transport: "webrtc"; signal: WebRTCSignal } | undefined> {
      if (payload.transport !== "webrtc") return undefined;

      const t = await ensureTransport();
      const maybe = await t.handleSignal(payload.signal as WebRTCSignal);

      return maybe ? { transport: "webrtc", signal: maybe } : undefined;
    },
    /**
     * Initiate WebRTC negotiation as the host.
     * Session doesn't need to know about offer/answer details.
     */
    async negotiateAsInitiator(options?: {
      iceRestart?: boolean;
    }): Promise<{ transport: "webrtc"; signal: WebRTCSignal }> {
      const t = await ensureTransport();
      const signal = await t.negotiateAsInitiator(options);

      return { transport: "webrtc", signal };
    },
    teardown,
  } as const;
}
