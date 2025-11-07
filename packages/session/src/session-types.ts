import type { SessionHandshakeParameters } from "@openlv/core";
import type { SignalingMode } from "@openlv/signaling";
import type { EventEmitter } from "eventemitter3";

import type { SessionEvents } from "./events.js";

export type SessionStatus =
  | "created"
  | "ready"
  | "signaling"
  | "connected"
  | "disconnected";

export type SessionStateObject = {
  status: SessionStatus;
  signaling?: {
    state: SignalingMode;
  };
  transport?: {
    type: "webrtc";
    state:
      | "webrtc-negotiating"
      | "webrtc-connecting"
      | "webrtc-connected"
      | "webrtc-failed"
      | "webrtc-closed";
    connected: boolean;
  };
};

/**
 * an OpenLV Session
 *
 * https://openlv.sh/api/session
 */
export interface Session {
  getState(): SessionStateObject;
  getHandshakeParameters(): SessionHandshakeParameters;
  connect(): Promise<void>;
  waitForLink(): Promise<void>;
  close(): Promise<void>;
  send(message: object, timeout?: number): Promise<unknown>;
  emitter: EventEmitter<SessionEvents>;
}
