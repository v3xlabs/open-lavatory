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

  if (!options.force && typeof g.RTCPeerConnection !== "undefined") {
    return false;
  }

  const exports = RNWebRTC as unknown as RNWebRTCExports;

  if (typeof exports.registerGlobals === "function") {
    exports.registerGlobals();

    return true;
  }

  if (
    typeof g.RTCPeerConnection === "undefined" &&
    typeof exports.RTCPeerConnection !== "undefined"
  ) {
    g.RTCPeerConnection = exports.RTCPeerConnection;
  }

  if (
    typeof g.RTCSessionDescription === "undefined" &&
    typeof exports.RTCSessionDescription !== "undefined"
  ) {
    g.RTCSessionDescription = exports.RTCSessionDescription;
  }

  if (
    typeof g.RTCIceCandidate === "undefined" &&
    typeof exports.RTCIceCandidate !== "undefined"
  ) {
    g.RTCIceCandidate = exports.RTCIceCandidate;
  }

  if (typeof exports.mediaDevices !== "undefined") {
    const nav = (g.navigator ?? {}) as Record<string, unknown>;

    if (typeof nav.mediaDevices === "undefined") {
      nav.mediaDevices = exports.mediaDevices;
    }

    g.navigator = nav;
  }

  return true;
};
