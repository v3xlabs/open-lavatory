import { match } from "ts-pattern";

import {
  createTransportBase,
  type CreateTransportLayerFn,
  type TransportMessage,
} from "../base.js";
import { log } from "../utils/log.js";

export type WebRTCConfig = {
  iceServers?: RTCConfiguration["iceServers"];
};

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

export const webrtc: CreateTransportLayerFn = (
  config: WebRTCConfig = defaultConfig,
) => {
  const { iceServers = defaultConfig.iceServers } = config;

  console.log("WEBRTC ICE CONFIG", config);
  const ident = Math.random().toString(36)
    .slice(2, 4) + "#";

  return createTransportBase(({ emitter, isHost }) => {
    const rtcConfig: RTCConfiguration = { iceServers };
    let connection: RTCPeerConnection | undefined;
    let channel: RTCDataChannel | undefined;

    const onConnectionStateChange = () => {
      log(ident, "onConnectionStateChange", connection?.connectionState);

      const state = connection?.connectionState;

      match(state)
        .with("disconnected", () => {
          // TODO: implement
        })
        .with("failed", () => {})
        .otherwise(() => {
          log(ident, "onConnectionStateChangeUnknown", state);
        });
    };
    const onIceCandidate = (c: RTCPeerConnectionIceEvent) => {
      if (channel?.readyState === "open") return;

      log(ident, "onIceCandidate", c.candidate);
      emitter.emit("candidate", JSON.stringify(c.candidate?.toJSON()));
    };
    const onDataChannel = (e: RTCDataChannelEvent) => {
      channel = e.channel;
      hookChannel(channel);
      log(ident, "onDataChannel", channel);
    };
    const onDataChannelOpen = () => {
      log(ident, "onDataChannelOpen");
      emitter.emit("connected");
    };
    const onDataChannelMessage = (e: MessageEvent<string>) => {
      log(ident, "onDataChannelMessage", e.data);
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
      channel.addEventListener("message", onDataChannelMessage);
    };

    const handle = async (message: TransportMessage) => {
      console.log(ident, "webrtc handle", message);

      if (!connection) throw new Error("Connection not found");

      match(message)
        .with({ type: "offer" }, async ({ payload }) => {
          console.log("offer", payload);
          // TODO: add zon schema?
          const offer = JSON.parse(payload) as RTCSessionDescriptionInit;

          await connection!.setRemoteDescription(
            new RTCSessionDescription(offer),
          );
          console.log(
            ident,
            "setRemoteDescriptionran",
            connection!.remoteDescription,
          );

          const answer = await connection!.createAnswer();

          await connection!.setLocalDescription(answer);
          emitter.emit("answer", JSON.stringify(answer));
        })
        .with({ type: "answer" }, async ({ payload }) => {
          if (!connection) throw new Error("Connection not found");

          console.log(ident, "answer", payload);
          const answer = JSON.parse(payload) as RTCSessionDescriptionInit;

          await connection.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
        })
        .with({ type: "candidate" }, async ({ payload }) => {
          if (!connection) throw new Error("Connection not found");

          if (!payload) return;

          console.log(ident, "candidate", payload);
          const candidate = JSON.parse(payload) as RTCIceCandidateInit;

          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        })
        .otherwise(() => {
          // biome-ignore lint/suspicious/noConsole: <x>
          console.warn("invalid message", message);
        });
    };

    const send = async (message: string) => {
      if (!channel) throw new Error("Channel not found");

      channel.send(message);
    };

    return {
      type: "webrtc",
      async setup() {
        log("webrtc setup");

        connection = new RTCPeerConnection(rtcConfig);
        connection.onconnectionstatechange = onConnectionStateChange;
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

        if (channel) {
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
  });
};
