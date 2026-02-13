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

  // eslint-disable-next-line import/no-default-export
  export default PolyfillCrypto;
}

declare module "base-64" {
  export function encode(input: string): string;
  export function decode(input: string): string;
}

declare module "fast-text-encoding" {}

declare module "react-native-url-polyfill/auto" {}
