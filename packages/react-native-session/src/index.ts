import "react-native-get-random-values";

import {
  connectSession as connectSessionBase,
  createSession as createSessionBase,
} from "@openlv/session";

import {
  ensureWebCryptoSubtle,
  installOpenLVReactNativePolyfills,
} from "./polyfills.js";

export {
  ensureWebCryptoSubtle,
  type EnsureWebCryptoSubtleOptions,
  installOpenLVReactNativePolyfills,
  OpenLVCryptoPolyfill,
} from "./polyfills.js";
export { OpenLVProvider, type OpenLVProviderProps } from "./provider.js";
export {
  installWebRTCPolyfills,
  type InstallWebRTCPolyfillsOptions,
} from "./webrtc.js";
export type {
  Session,
  SessionState,
  SessionStateObject,
} from "@openlv/session";
export { SESSION_STATE } from "@openlv/session";

export const createSession: typeof createSessionBase = async (
  initParameters,
  signalLayer,
  onMessage,
) => {
  await installOpenLVReactNativePolyfills();
  await ensureWebCryptoSubtle();

  return createSessionBase(initParameters, signalLayer, onMessage);
};

export const connectSession: typeof connectSessionBase = async (
  connectionUrl,
  onMessage,
) => {
  await installOpenLVReactNativePolyfills();
  await ensureWebCryptoSubtle();

  return connectSessionBase(connectionUrl, onMessage);
};
