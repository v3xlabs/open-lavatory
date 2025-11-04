import type { MaybePromise } from "viem";

export type TransportInit = {
  type: string;
  setup: () => MaybePromise<void>;
  teardown: () => MaybePromise<void>;
};

export type TransportLayer = {
  type: string;
  foo: "bar";
};

export const createTransportLayerBase = (
  init: TransportInit,
): TransportLayer => {
  //

  return {
    type: init.type,
    foo: "bar",
  };
};
