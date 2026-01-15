import "react-native-url-polyfill/auto";
import "fast-text-encoding";
import "react-native-get-random-values";

import * as React from "react";

import {
  ensureWebCryptoSubtle,
  installOpenLVReactNativePolyfills,
  OpenLVCryptoPolyfill,
} from "./polyfills.js";

export type OpenLVGlobalsProps = {
  cryptoTimeoutMs?: number;
};

const getGlobal = () => globalThis as unknown as Record<string, unknown>;

export const OpenLVGlobals = ({
  cryptoTimeoutMs,
}: OpenLVGlobalsProps = {}): React.ReactElement => {
  const [error, setError] = React.useState<unknown>(undefined);

  React.useEffect(() => {
    try {
      const g = getGlobal();

      g.__openlvRnGlobalsMounted = true;

      if (!g.__openlvRnPolyfillsInstalled) {
        g.__openlvRnPolyfillsInstalled = true;

        installOpenLVReactNativePolyfills();
      }
    } catch (e) {
      setError(e);
    }
  }, []);

  // WebCrypto is delivered by the WebView polyfill, which becomes available
  // asynchronously after the component mounts.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureWebCryptoSubtle({ timeoutMs: cryptoTimeoutMs });

        const g = getGlobal();

        g.__openlvRnCryptoReady = true;
      } catch (e) {
        if (!cancelled) setError(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cryptoTimeoutMs]);

  if (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`OpenLVGlobals initialization failed: ${message}`);
  }

  return <OpenLVCryptoPolyfill />;
};
