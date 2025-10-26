
import { Emitter } from "@wagmi/core/internal";
import type {  } from "viem";
import { ProviderEvents } from "./events";

export type OpenLVProviderParameters = {
  foo: 'bar';
};

export type OpenLVProvider = Emitter<ProviderEvents>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createProvider = (_parameters: OpenLVProviderParameters): OpenLVProvider => {
  // hello

  return new Emitter('x');
};
