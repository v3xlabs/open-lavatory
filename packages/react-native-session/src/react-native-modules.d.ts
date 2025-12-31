declare module "react-native-webrtc" {
  export function registerGlobals(): void;
  export const RTCPeerConnection: unknown;
  export const RTCSessionDescription: unknown;
  export const RTCIceCandidate: unknown;
  export const mediaDevices: unknown;
}

declare module "react-native-webview-crypto" {
  import * as React from "react";
  const PolyfillCrypto: React.ComponentType<Record<string, unknown>>;
  export default PolyfillCrypto;
}
