import { match } from "ts-pattern";

import {
  createTransportBase,
  type Transport,
  type TransportLivenessConfig,
  type TransportMessage,
} from "../index.js";
import { log } from "../utils/log.js";

export type WebRTCConfig = {
  iceServers?: RTCConfiguration["iceServers"];
} & TransportLivenessConfig;

// TODO: decide wether we want defaults, and if so what defaults
const defaultConfig: WebRTCConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com:3478" },
    {
      urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443"],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export const webrtc: Transport = (
  config: WebRTCConfig = defaultConfig,
) => {
  const {
    iceServers = defaultConfig.iceServers,
    probeInterval,
    heartbeatInterval,
    heartbeatTimeout,
  } = config;

  const ident = Math.random().toString(36)
    .slice(2, 4) + "#";

  return createTransportBase(({ emitter, isHost }) => {
    const rtcConfig: RTCConfiguration = { iceServers };
    let connection: RTCPeerConnection | undefined;
    let channel: RTCDataChannel | undefined;
    let isReady = false;
    const pendingCandidates: RTCIceCandidateInit[] = [];

    const markReadyIfOpen = () => {
      if (isReady || channel?.readyState !== "open") return;

      isReady = true;
      emitter.emit("ready");
    };

    const addCandidate = async (candidate: RTCIceCandidateInit) => {
      if (!connection) throw new Error("Connection not found");

      if (!connection.remoteDescription) {
        pendingCandidates.push(candidate);

        return;
      }

      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const flushPendingCandidates = async () => {
      if (!connection?.remoteDescription) return;

      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();

        if (candidate) await connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const onConnectionStateChange = () => {
      log(ident, "onConnectionStateChange", connection?.connectionState);

      const state = connection?.connectionState;

      match(state)
        .with("connected", () => {
          markReadyIfOpen();
        })
        .with("disconnected", () => {
          log(ident, "onConnectionStateDisconnected");
        })
        .with("closed", () => {
          isReady = false;
          emitter.emit("close");
        })
        .with("failed", () => {
          isReady = false;
          emitter.emit("error", new Error("WebRTC connection failed"));
        })
        .otherwise(() => {
          log(ident, "onConnectionStateChangeUnknown", state);
        });
    };
    const onIceConnectionStateChange = () => {
      log(ident, "onIceConnectionStateChange", connection?.iceConnectionState);

      const state = connection?.iceConnectionState;

      match(state)
        .with("connected", "completed", () => {
          markReadyIfOpen();
        })
        .with("disconnected", () => {
          log(ident, "onIceConnectionStateDisconnected");
        })
        .with("closed", () => {
          isReady = false;
          emitter.emit("close");
        })
        .with("failed", () => {
          isReady = false;
          emitter.emit("error", new Error("WebRTC ICE connection failed"));
        })
        .otherwise(() => {
          log(ident, "onIceConnectionStateChangeUnknown", state);
        });
    };
    const onIceCandidate = (c: RTCPeerConnectionIceEvent) => {
      if (channel?.readyState === "open") return;

      log(ident, "onIceCandidate", c.candidate);
      if (!c.candidate) return;

      emitter.emit("candidate", JSON.stringify(c.candidate.toJSON()));
    };
    const onDataChannel = (e: RTCDataChannelEvent) => {
      if (channel) {
        unhookChannel(channel);
        channel.close();
      }

      channel = e.channel;
      isReady = false;
      hookChannel(channel);
      log(ident, "onDataChannel", channel);
    };
    const onDataChannelOpen = () => {
      log(ident, "onDataChannelOpen");
      markReadyIfOpen();
    };
    const onDataChannelClose = (e: Event) => {
      log(ident, "onDataChannelClose");
      const closedChannel = e.currentTarget as RTCDataChannel;

      unhookChannel(closedChannel);

      if (channel === closedChannel) {
        channel = undefined;
        isReady = false;
        emitter.emit("close");
      }
    };
    const onDataChannelError = (e: Event) => {
      log(ident, "onDataChannelError", e);

      if (e.currentTarget !== channel) return;

      isReady = false;
      emitter.emit("error", new Error("WebRTC data channel error"));
    };
    const onDataChannelMessage = (e: MessageEvent<string>) => {
      log(ident, "onDataChannelMessage", e.data);

      markReadyIfOpen();
      emitter.emit("message", e.data);
    };
    const onNegotiationNeeded = async () => {
      log(ident, "onNegotiationNeeded");

      if (isHost && connection) {
        await connection.setLocalDescription();

        if (connection.localDescription)
          emitter.emit("offer", JSON.stringify(connection.localDescription));
      }
    };

    const hookChannel = (channel: RTCDataChannel) => {
      channel.addEventListener("open", onDataChannelOpen);
      channel.addEventListener("close", onDataChannelClose);
      channel.addEventListener("error", onDataChannelError);
      channel.addEventListener("message", onDataChannelMessage);
      markReadyIfOpen();
    };

    const unhookChannel = (channel: RTCDataChannel) => {
      channel.removeEventListener("open", onDataChannelOpen);
      channel.removeEventListener("close", onDataChannelClose);
      channel.removeEventListener("error", onDataChannelError);
      channel.removeEventListener("message", onDataChannelMessage);
    };

    const handle = async (message: TransportMessage): Promise<void> => {
      log(ident, "webrtc handle", message);

      if (!connection) throw new Error("Connection not found");

      return match(message)
        .with({ type: "offer" }, async ({ payload }) => {
          const offer = JSON.parse(payload) as RTCSessionDescriptionInit;

          await connection!.setRemoteDescription(
            new RTCSessionDescription(offer),
          );
          await flushPendingCandidates();

          const answer = await connection!.createAnswer();

          await connection!.setLocalDescription(answer);
          emitter.emit("answer", JSON.stringify(answer));
        })
        .with({ type: "answer" }, async ({ payload }) => {
          if (!connection) throw new Error("Connection not found");

          const answer = JSON.parse(payload) as RTCSessionDescriptionInit;

          await connection.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
          await flushPendingCandidates();
        })
        .with({ type: "candidate" }, async ({ payload }) => {
          if (!connection) throw new Error("Connection not found");

          if (!payload) return;

          const candidate = JSON.parse(payload) as RTCIceCandidateInit;

          await addCandidate(candidate);
        })
        .otherwise(() => {
          log(ident, "received unknown transport message type", message);
        });
    };

    const send = async (message: string) => {
      if (!channel) throw new Error("Channel not found");

      if (channel.readyState !== "open") throw new Error("Channel not open");

      channel.send(message);
    };

    return {
      type: "webrtc",
      async setup() {
        log("webrtc setup", rtcConfig);

        connection = new RTCPeerConnection(rtcConfig);
        connection.onconnectionstatechange = onConnectionStateChange;
        connection.oniceconnectionstatechange = onIceConnectionStateChange;
        connection.onicecandidate = onIceCandidate;
        connection.ondatachannel = onDataChannel;
        connection.onnegotiationneeded = onNegotiationNeeded;

        if (isHost) {
          channel = connection.createDataChannel("openlv-data");
          hookChannel(channel);
        }
      },
      teardown() {
        log("webrtc teardown");

        isReady = false;
        pendingCandidates.length = 0;

        if (channel) {
          unhookChannel(channel);
          channel.close();
          channel = undefined;
        }

        if (connection) {
          connection.close();
          connection = undefined;
        }
      },
      handle,
      send,
    };
  }, { probeInterval, heartbeatInterval, heartbeatTimeout });
};
