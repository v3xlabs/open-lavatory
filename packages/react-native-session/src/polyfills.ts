import * as React from "react";

import { installWebRTCPolyfills } from "./webrtc.js";

// eslint-disable-next-line no-restricted-syntax
declare const require: undefined | ((id: string) => unknown);

export type EnsureWebCryptoSubtleOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
};

const getGlobal = () => globalThis as unknown as Record<string, unknown>;

const getCrypto = () => {
  const g = getGlobal();

  const maybeWindow = g.window as undefined | Record<string, unknown>;

  return (g.crypto ?? maybeWindow?.crypto) as
    | undefined
    | Record<string, unknown>;
};

const hasWebCryptoSubtle = (): boolean => {
  const crypto = getCrypto();

  return !!crypto && typeof crypto.subtle !== "undefined";
};

const hasGetRandomValues = (): boolean => {
  const crypto = getCrypto();

  return !!crypto && typeof crypto.getRandomValues === "function";
};

const ensureAtobBtoa = () => {
  const g = getGlobal();

  if (typeof g.btoa === "undefined") {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    g.btoa = (input: string) => {
      const str = String(input);
      let output = "";

      for (
        let block = 0, charCode: number, idx = 0, map = chars;
        str.charAt(idx | 0) || ((map = "="), idx % 1);
        output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
      ) {
        charCode = str.charCodeAt((idx += 3 / 4));

        if (charCode > 0xff) {
          throw new Error(
            "@openlv/react-native-session: btoa() only supports Latin1 strings.",
          );
        }

        block = (block << 8) | charCode;
      }

      return output;
    };
  }

  if (typeof g.atob === "undefined") {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    g.atob = (input: string) => {
      const str = String(input).replace(/=+$/, "");

      if (str.length % 4 === 1) {
        throw new Error("@openlv/react-native-session: Invalid base64 string.");
      }

      let output = "";

      for (
        let bc = 0, bs = 0, buffer: number, idx = 0;
        (buffer = str.charCodeAt(idx++));
        // biome-ignore lint/suspicious/noAssignInExpressions: intentional
        ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
          ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
          : 0
      ) {
        buffer = chars.indexOf(String.fromCharCode(buffer));
      }

      return output;
    };
  }
};

const ensureCryptoRandomUUID = () => {
  const g = getGlobal();

  if (!g.crypto) {
    throw new Error(
      "@openlv/react-native-session: globalThis.crypto is missing. Install WebCrypto polyfills (react-native-webview-crypto) and randomness polyfills (react-native-get-random-values).",
    );
  }

  const crypto = g.crypto as Record<string, unknown>;

  if (typeof crypto.randomUUID === "function") return;

  if (typeof crypto.getRandomValues !== "function") {
    throw new Error(
      "@openlv/react-native-session: crypto.getRandomValues is missing. Wrap your app with <OpenLVProvider> from '@openlv/react-native-session/provider'.",
    );
  }

  crypto.randomUUID = () => {
    const bytes = new Uint8Array(16);

    (crypto.getRandomValues as (a: Uint8Array) => Uint8Array)(bytes);

    // RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));

    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    );
  };
};

const ensureMinimumGlobalsForSession = () => {
  const g = getGlobal();

  if (typeof g.URL === "undefined") {
    throw new Error(
      "@openlv/react-native-session: global URL is missing. Install a URL polyfill (e.g. 'react-native-url-polyfill') or use an environment that provides URL.",
    );
  }

  if (
    typeof g.TextEncoder === "undefined" ||
    typeof g.TextDecoder === "undefined"
  ) {
    throw new Error(
      "@openlv/react-native-session: TextEncoder/TextDecoder are missing. Use Hermes/modern RN, or add a polyfill (e.g. 'fast-text-encoding').",
    );
  }

  ensureAtobBtoa();

  if (!hasGetRandomValues()) {
    throw new Error(
      "@openlv/react-native-session: crypto.getRandomValues is missing. Wrap your app with <OpenLVProvider> from '@openlv/react-native-session/provider'.",
    );
  }

  ensureCryptoRandomUUID();
};

export const ensureWebCryptoSubtle = async (
  options: EnsureWebCryptoSubtleOptions = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const pollIntervalMs = options.pollIntervalMs ?? 25;

  if (hasWebCryptoSubtle()) return;

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    if (hasWebCryptoSubtle()) return;
  }

  throw new Error(
    "@openlv/react-native-session: WebCrypto is not ready (crypto.subtle missing). Wrap your app with <OpenLVProvider> from '@openlv/react-native-session/provider' (or render <OpenLVCryptoPolyfill /> manually) and ensure 'react-native-webview' + 'react-native-webview-crypto' are installed.",
  );
};

export const installOpenLVReactNativePolyfills = async (): Promise<void> => {
  installWebRTCPolyfills();
  ensureMinimumGlobalsForSession();
};

export const OpenLVCryptoPolyfill = (
  props: Record<string, unknown> = {},
): React.ReactElement => {
  if (typeof require !== "function") {
    throw new Error(
      "@openlv/react-native-session: OpenLVCryptoPolyfill requires Metro/CJS require().",
    );
  }

  let mod: unknown;

  try {
    mod = require("react-native-webview-crypto");
  } catch {
    throw new Error(
      "@openlv/react-native-session: Missing peer dependency 'react-native-webview-crypto'. Install it (and 'react-native-webview') in your React Native app.",
    );
  }

  const PolyfillCrypto =
    (mod as { default?: unknown }).default ?? (mod as unknown);

  if (typeof PolyfillCrypto !== "function") {
    throw new Error(
      "@openlv/react-native-session: react-native-webview-crypto has an unexpected export shape.",
    );
  }

  return React.createElement(
    PolyfillCrypto as React.ComponentType<Record<string, unknown>>,
    props,
  );
};
