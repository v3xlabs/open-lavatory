import { match } from "ts-pattern";

import { createTransportLayerBase } from "../base.js";

export type WebRTCSignal =
  | { op: "offer"; sdp: RTCSessionDescriptionInit }
  | { op: "answer"; sdp: RTCSessionDescriptionInit }
  | { op: "ice"; candidate: RTCIceCandidateInit };

export type WebRTCTransport = ReturnType<typeof webrtc>;

export const webrtc = (opts: {
  onSignal?: (signal: WebRTCSignal) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onDataChannelOpen?: () => void; // fired when the data channel is actually open
  createDataChannel?: boolean; // default true (initiator should pass true)
}) => {
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let messageHandler: ((data: unknown) => void) | null = null;
  const signalHandlers = new Set<(s: WebRTCSignal) => void>();
  const pendingRemoteCandidates: RTCIceCandidateInit[] = [];

  if (opts?.onSignal) signalHandlers.add(opts.onSignal);

  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
  ];

  const base = createTransportLayerBase({
    type: "webrtc",
    async setup() {
      peerConnection = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      });

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection?.connectionState;

        // Notify caller and log.
        if (state) opts.onConnectionStateChange?.(state);

        console.log("WebRTC connection state:", state);
      };

      peerConnection.onicecandidate = (iceEvent) => {
        const candidate = iceEvent.candidate?.toJSON();

        if (candidate) {
          const signal: WebRTCSignal = { op: "ice", candidate };

          signalHandlers.forEach((h) => h(signal));
        }
      };

      // Create a data channel only if requested (typically only by initiator)
      if (opts?.createDataChannel !== false) {
        dataChannel = peerConnection.createDataChannel("openlv-data");

        dataChannel.onopen = () => {
          console.log("WebRTC data channel open");
          opts.onDataChannelOpen?.();
        };

        dataChannel.onmessage = (event: MessageEvent) => {
          if (messageHandler) messageHandler(event.data);
        };
      }

      peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
        dataChannel = event.channel;
        dataChannel.onopen = () => {
          console.log("WebRTC data channel open");
          opts.onDataChannelOpen?.();
        };
        dataChannel.onmessage = (event: MessageEvent) => {
          if (messageHandler) messageHandler(event.data);
        };
      };
    },
    async teardown() {
      try {
        if (dataChannel && dataChannel.readyState !== "closed")
          dataChannel.close();
      } catch {
        console.error("Error closing WebRTC data channel");
      }

      dataChannel = null;

      try {
        peerConnection?.close();
      } catch {
        console.error("Error closing WebRTC peer connection");
      }

      peerConnection = null;
    },
  });

  const ensurePeerConnection = () => {
    if (!peerConnection) throw new Error("WebRTC transport not set up yet");

    return peerConnection;
  };

  const ensureDataChannel = () => {
    if (!dataChannel) throw new Error("WebRTC data channel not ready");

    return dataChannel;
  };

  return {
    ...base,
    async negotiateAsInitiator() {
      const peerConnection = ensurePeerConnection();
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await peerConnection.setLocalDescription(offer);

      return { op: "offer", sdp: offer } as const;
    },
    async handleSignal(signal: WebRTCSignal) {
      const peerConnection = ensurePeerConnection();

      const flushPendingRemoteCandidates = async () => {
        while (pendingRemoteCandidates.length) {
          const candidate = pendingRemoteCandidates.shift()!;

          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          } catch (err) {
            console.warn("Failed to add queued ICE candidate", err);
          }
        }
      };

      return match(signal)
        .with({ op: "offer" }, async ({ sdp }) => {
          await peerConnection.setRemoteDescription(sdp);
          const answer = await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(answer);
          await flushPendingRemoteCandidates();

          return { op: "answer", sdp: answer } as const;
        })
        .with({ op: "answer" }, async ({ sdp }) => {
          await peerConnection.setRemoteDescription(sdp);
          await flushPendingRemoteCandidates();

          return undefined;
        })
        .with({ op: "ice" }, async ({ candidate }) => {
          // If remote description is not yet set, queue the candidate
          if (!peerConnection.remoteDescription) {
            pendingRemoteCandidates.push(candidate);
          } else {
            try {
              await peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate),
              );
            } catch (err) {
              console.warn("Failed to add ICE candidate", err);
            }
          }

          return undefined;
        })
        .exhaustive();
    },
    onSignal(handler: (signal: WebRTCSignal) => void) {
      signalHandlers.add(handler);
    },
    onMessage(handler: (data: unknown) => void) {
      messageHandler = handler;
    },
    send(text: string) {
      const channel = ensureDataChannel();

      channel.send(text);
    },
    getState() {
      return {
        connected:
          !!peerConnection && peerConnection.connectionState === "connected",
      };
    },
  };
};
