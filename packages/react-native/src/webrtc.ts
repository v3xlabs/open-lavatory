export type InstallWebRTCPolyfillsOptions = {
  force?: boolean;
};

import * as RNWebRTC from "react-native-webrtc";

type RNWebRTCExports = {
  registerGlobals?: () => void;
  RTCPeerConnection?: unknown;
  RTCSessionDescription?: unknown;
  RTCIceCandidate?: unknown;
  mediaDevices?: unknown;
};

const getGlobal = () => globalThis as unknown as Record<string, unknown>;

export const installWebRTCPolyfills = (
  options: InstallWebRTCPolyfillsOptions = {},
): boolean => {
  const g = getGlobal();

  if (!options.force && g.RTCPeerConnection !== undefined) {
    return false;
  }

  const exports = RNWebRTC as unknown as RNWebRTCExports;

  if (typeof exports.registerGlobals === "function") {
    exports.registerGlobals();

    return true;
  }

  if (
    g.RTCPeerConnection === undefined
    && exports.RTCPeerConnection !== undefined
  ) {
    g.RTCPeerConnection = exports.RTCPeerConnection;
  }

  if (
    g.RTCSessionDescription === undefined
    && exports.RTCSessionDescription !== undefined
  ) {
    g.RTCSessionDescription = exports.RTCSessionDescription;
  }

  if (
    g.RTCIceCandidate === undefined
    && exports.RTCIceCandidate !== undefined
  ) {
    g.RTCIceCandidate = exports.RTCIceCandidate;
  }

  if (exports.mediaDevices !== undefined) {
    const nav = (g.navigator ?? {}) as Record<string, unknown>;

    if (nav.mediaDevices === undefined) {
      nav.mediaDevices = exports.mediaDevices;
    }

    g.navigator = nav;
  }

  return true;
};
