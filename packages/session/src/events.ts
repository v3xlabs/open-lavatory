import type { SessionStateObject } from "./base.js";

export type SessionEvents = {
  state_change: (state?: SessionStateObject) => void;
};
