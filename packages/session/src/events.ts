import type { SessionStateObject } from "./session-types.js";

export type SessionEvents = {
  state_change: (state?: SessionStateObject) => void;
};
