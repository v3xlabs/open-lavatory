export const SIGNAL_STATE = {
  STANDBY: "standby",
  CONNECTING: "connecting",
  READY: "ready",
  HANDSHAKE: "handshake",
  HANDSHAKE_PARTIAL: "handshake-partial",
  ENCRYPTED: "encrypted",
  ERROR: "error",
} as const;
export type SignalState = (typeof SIGNAL_STATE)[keyof typeof SIGNAL_STATE];

export type SignalEventMap = {
  state_change: (state: SignalState) => void;
  message: (message: object) => void;
};
