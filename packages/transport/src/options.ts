import type { WebRTCConfig } from "./webrtc/index.js";

export type TransportOptions = {
  type: "webrtc";
  config?: WebRTCConfig;
};
