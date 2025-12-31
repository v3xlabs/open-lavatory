import { assertOpenLVReady } from "./assert.js";

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

export const SESSION_STATE = {
  CREATED: "created",
  SIGNALING: "signaling",
  READY: "ready",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
} as const;

type SessionModule = typeof import("@openlv/session");

export const createSession = async (
  ...args: Parameters<SessionModule["createSession"]>
): Promise<Awaited<ReturnType<SessionModule["createSession"]>>> => {
  assertOpenLVReady({ requireCryptoReady: true });
  const mod = (await import("@openlv/session")) as SessionModule;

  return mod.createSession(...args);
};

export const connectSession = async (
  ...args: Parameters<SessionModule["connectSession"]>
): Promise<Awaited<ReturnType<SessionModule["connectSession"]>>> => {
  assertOpenLVReady({ requireCryptoReady: true });
  const mod = (await import("@openlv/session")) as SessionModule;

  return mod.connectSession(...args);
};
