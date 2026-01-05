const getGlobal = () => globalThis as unknown as Record<string, unknown>;

export type AssertOpenLVReadyOptions = {
  requireCryptoReady?: boolean;
};

export const assertOpenLVReady = (
  options: AssertOpenLVReadyOptions = {},
): void => {
  const g = getGlobal();

  if (!g.__openlvRnProviderMounted) {
    throw new Error(
      "@openlv/react-native: OpenLVProvider is not mounted. Wrap your OpenLV-related code with <OpenLVProvider> from '@openlv/react-native/provider'.",
    );
  }

  if (typeof g.RTCPeerConnection === "undefined") {
    throw new Error(
      "@openlv/react-native: WebRTC globals are missing (RTCPeerConnection). Ensure react-native-webrtc is available and OpenLVProvider has mounted.",
    );
  }

  const cryptoFromGlobal = g.crypto as undefined | Record<string, unknown>;
  const cryptoFromWindow = (g.window as undefined | Record<string, unknown>)
    ?.crypto as undefined | Record<string, unknown>;
  const crypto = cryptoFromGlobal ?? cryptoFromWindow;

  if (!crypto || typeof crypto.getRandomValues !== "function") {
    throw new Error(
      "@openlv/react-native: crypto.getRandomValues is missing. Ensure OpenLVProvider is mounted (it loads react-native-get-random-values).",
    );
  }

  if (options.requireCryptoReady && typeof crypto.subtle === "undefined") {
    throw new Error(
      "@openlv/react-native: WebCrypto is not ready (crypto.subtle missing). Ensure OpenLVProvider has mounted; the WebView crypto bridge may still be initializing.",
    );
  }
};
