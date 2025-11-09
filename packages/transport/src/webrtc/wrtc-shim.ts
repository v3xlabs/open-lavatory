type MutableGlobal = typeof globalThis & {
  RTCPeerConnection?: typeof RTCPeerConnection;
  RTCSessionDescription?: typeof RTCSessionDescription;
  RTCIceCandidate?: typeof RTCIceCandidate;
};

type WrtcLikeModule = {
  RTCPeerConnection?: typeof RTCPeerConnection;
  RTCSessionDescription?: typeof RTCSessionDescription;
  RTCIceCandidate?: typeof RTCIceCandidate;
  default?: WrtcLikeModule;
};

const hasWebRTCPrimitives = (): boolean => {
  if (typeof globalThis === "undefined") return false;

  const g = globalThis as MutableGlobal;

  return typeof g.RTCPeerConnection !== "undefined";
};

export async function ensureNodeWebRTC(): Promise<void> {
  if (hasWebRTCPrimitives()) return;

  let wrtcModule: WrtcLikeModule;

  try {
    wrtcModule = (await import("@roamhq/wrtc")) as unknown as WrtcLikeModule;
  } catch {
    throw new Error(
      "WebRTC required but not available: install @roamhq/wrtc for Node environments",
    );
  }

  const resolved: WrtcLikeModule =
    (wrtcModule.default as WrtcLikeModule | undefined) ?? wrtcModule;

  if (!resolved?.RTCPeerConnection) {
    throw new Error("@roamhq/wrtc does not expose RTCPeerConnection");
  }

  const g = globalThis as MutableGlobal;

  g.RTCPeerConnection = resolved.RTCPeerConnection;

  if (resolved.RTCSessionDescription) {
    g.RTCSessionDescription = resolved.RTCSessionDescription;
  }

  if (resolved.RTCIceCandidate) {
    g.RTCIceCandidate = resolved.RTCIceCandidate;
  }
}

export const hasNativeWebRTC = (): boolean => hasWebRTCPrimitives();
