/* eslint-disable sonarjs/no-duplicate-string */
import { createTransportLayerBase } from "../base.js";

export type WebRTCSignal =
  | { op: "offer"; sdp: RTCSessionDescriptionInit }
  | { op: "answer"; sdp: RTCSessionDescriptionInit }
  | { op: "ice"; candidate: RTCIceCandidateInit };

export type WebRTCTransport = ReturnType<typeof webrtc>;

export const webrtc = (opts?: {
  onSignal?: (signal: WebRTCSignal) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  createDataChannel?: boolean; // default true (initiator should pass true)
}) => {
  let peerConnection: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let messageHandler: ((data: unknown) => void) | null = null;
  const signalHandlers = new Set<(s: WebRTCSignal) => void>();
  const pendingRemoteCandidates: RTCIceCandidateInit[] = [];

  if (opts?.onSignal) signalHandlers.add(opts.onSignal);

  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com:3478" },
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
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
        if (state) opts?.onConnectionStateChange?.(state);

        console.log("WebRTC connection state:", state);
      };

      peerConnection.onicecandidate = (ev) => {
        const c = ev.candidate?.toJSON();

        if (c) {
          const sig: WebRTCSignal = { op: "ice", candidate: c };

          signalHandlers.forEach((h) => h(sig));
        }
      };

      // Create a data channel only if requested (typically only by initiator)
      if (opts?.createDataChannel !== false) {
        dc = peerConnection.createDataChannel("openlv-data");

        dc.onopen = () => {
          console.log("WebRTC data channel open");
        };

        dc.onmessage = (ev: MessageEvent) => {
          if (messageHandler) messageHandler(ev.data);
        };
      }

      peerConnection.ondatachannel = (ev: RTCDataChannelEvent) => {
        dc = ev.channel;
        dc.onopen = () => {
          console.log("WebRTC data channel open");
        };
        dc.onmessage = (e: MessageEvent) => {
          if (messageHandler) messageHandler(e.data);
        };
      };
    },
    async teardown() {
      try {
        if (dc && dc.readyState !== "closed") dc.close();
      } catch {
        console.error("Error closing WebRTC data channel");
      }

      dc = null;

      try {
        peerConnection?.close();
      } catch {
        console.error("Error closing WebRTC peer connection");
      }

      peerConnection = null;
    },
  });

  const ensurePC = () => {
    if (!peerConnection) throw new Error("WebRTC transport not set up yet");

    return peerConnection;
  };

  const ensureDC = () => {
    if (!dc) throw new Error("WebRTC data channel not ready");

    return dc;
  };

  return {
    ...base,
    async negotiateAsInitiator() {
      const pc = ensurePC();
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await pc.setLocalDescription(offer);

      return { op: "offer", sdp: offer } as const;
    },
    async handleSignal(signal: WebRTCSignal) {
      const pc = ensurePC();

      if (signal.op === "offer") {
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        // Apply any ICE candidates we received before remote description
        while (pendingRemoteCandidates.length) {
          const cand = pendingRemoteCandidates.shift()!;

          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate", err);
          }
        }

        return { op: "answer", sdp: answer } as const;
      }

      if (signal.op === "answer") {
        await pc.setRemoteDescription(signal.sdp);

        // Apply any ICE candidates we received before remote description
        while (pendingRemoteCandidates.length) {
          const cand = pendingRemoteCandidates.shift()!;

          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate", err);
          }
        }

        return undefined;
      }

      if (signal.op === "ice") {
        // If remote description is not yet set, queue the candidate
        if (!pc.remoteDescription) {
          pendingRemoteCandidates.push(signal.candidate);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.warn("Failed to add ICE candidate", err);
          }
        }

        return undefined;
      }

      return undefined;
    },
    onSignal(handler: (signal: WebRTCSignal) => void) {
      signalHandlers.add(handler);
    },
    onMessage(handler: (data: unknown) => void) {
      messageHandler = handler;
    },
    send(text: string) {
      const ch = ensureDC();

      ch.send(text);
    },
    getState() {
      return {
        connected:
          !!peerConnection && peerConnection.connectionState === "connected",
      };
    },
  };
};
