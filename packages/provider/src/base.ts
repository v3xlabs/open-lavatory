import { Emitter } from "@wagmi/core/internal";

import { ProviderEvents } from "./events";

export type OpenLVProviderParameters = {
  foo: 'bar';
};

export type OpenLVProvider = {
  emitter: Emitter<ProviderEvents>;
  connect: () => Promise<void>;
};

let modal: (() => void) | undefined;

export const getModal = async () => {
  if (!modal) {
    modal = await import('@openlv/modal').then(m => m.triggerOpenModal);
  }

  return modal;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createProvider = (_parameters: OpenLVProviderParameters): OpenLVProvider => {
  // hello
  const emitter = new Emitter('x');
  //

  return {
    async connect() {
      const modal = await getModal();

      console.log('loading modal');
      modal?.();
    },
    emitter,
  };
};
