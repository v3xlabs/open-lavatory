import type { BaseError } from "@openlv/core/errors";

import type { SessionStateObject } from "./base.js";

export type SessionEvents = {
  state_change: (state?: SessionStateObject) => void;
  error: (error: BaseError) => void;
};
