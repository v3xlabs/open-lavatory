export type InstallWebRTCPolyfillsOptions = {
  force?: boolean;
};

declare const require: undefined | ((id: string) => unknown);

type RNWebRTCModule = {
  registerGlobals?: () => void;
  RTCPeerConnection?: unknown;
  RTCSessionDescription?: unknown;
  RTCIceCandidate?: unknown;
  mediaDevices?: unknown;
};

const getGlobal = () => globalThis as unknown as Record<string, unknown>;

const tryLoadReactNativeWebRTC = (): RNWebRTCModule | undefined => {
  if (typeof require !== "function") return undefined;

  try {
    return require("react-native-webrtc") as RNWebRTCModule;
  } catch {
    return undefined;
  }
};

export const installWebRTCPolyfills = (
  options: InstallWebRTCPolyfillsOptions = {},
): boolean => {
  const g = getGlobal();

  if (!options.force && typeof g.RTCPeerConnection !== "undefined") {
    return false;
  }

  const mod = tryLoadReactNativeWebRTC();

  if (!mod) {
    throw new Error(
      "@openlv/react-native-session: Missing peer dependency 'react-native-webrtc'. Install it in your React Native app before calling installWebRTCPolyfills().",
    );
  }

  if (typeof mod.registerGlobals === "function") {
    mod.registerGlobals();
    return true;
  }

  if (typeof g.RTCPeerConnection === "undefined" && mod.RTCPeerConnection) {
    g.RTCPeerConnection = mod.RTCPeerConnection;
  }

  if (
    typeof g.RTCSessionDescription === "undefined" &&
    mod.RTCSessionDescription
  ) {
    g.RTCSessionDescription = mod.RTCSessionDescription;
  }

  if (typeof g.RTCIceCandidate === "undefined" && mod.RTCIceCandidate) {
    g.RTCIceCandidate = mod.RTCIceCandidate;
  }

  if (mod.mediaDevices) {
    const nav = (g.navigator ?? {}) as Record<string, unknown>;
    if (typeof nav.mediaDevices === "undefined") {
      nav.mediaDevices = mod.mediaDevices;
    }
    g.navigator = nav;
  }

  return true;
};
