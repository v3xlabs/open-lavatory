import type { MaybePromise } from "viem";

export type TransportType = "webrtc";

export type TransportInit = {
  type: TransportType;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
};

export type TransportLayer = {
  type: TransportType;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
};

/**
 * Base Transport Layer implementation
 *
 * https://openlv.sh/api/transport
 */
export const createTransportLayerBase = (
  init: TransportInit,
): TransportLayer => {
  return {
    type: init.type,
    setup: init.setup,
    teardown: init.teardown,
  };
};
