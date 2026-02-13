import { openlv } from "@openlv/connector";
import { triggerOpenModal } from "@openlv/modal";
import { createProvider, type OpenLVProvider } from "@openlv/provider";

declare global {
  interface Window {
    openlv: OpenLVProvider;
    ethereum: OpenLVProvider;
  }
}

const connector = openlv({})({ chains: [] } as { chains: readonly []; });
const { uuid, name, icon, rdns } = connector;

// eslint-disable-next-line import/no-default-export
export default defineUnlistedScript(() => {
  console.log("INJECTED HERE");

  // Prevent multiple injections
  //   if (window.openlv?.isOpenLV) {
  //     return;
  //   }

  console.log("OpenLV EIP-6963 Provider Injected");
  // @ts-expect-error
  const provider = createProvider({
    openModal: async (provider) => {
      console.log("openModal", provider);
      triggerOpenModal(provider, () => {
        console.log("injected received modal close");

        if (provider.getState().status !== "connected") {
          // cleanup
          provider.closeSession();
        }
      });
    },
  });

  // // Expose provider globally
  globalThis.openlv = provider;

  // // For backwards compatibility, also expose as window.ethereum if not already set
  if (!globalThis.ethereum) {
    globalThis.ethereum = provider;
  }

  const providerInfo = { uuid, name, icon, rdns };

  // EIP-6963 Provider Detail
  const providerDetail = Object.freeze({
    info: providerInfo,
    provider,
  });

  // Announce provider
  const announceProvider = () => {
    const event = new CustomEvent("eip6963:announceProvider", {
      detail: providerDetail,
    });

    globalThis.dispatchEvent(event);
  };

  // Listen for provider requests
  globalThis.addEventListener("eip6963:requestProvider", announceProvider);

  // Announce immediately
  announceProvider();

  console.log(
    "OpenLV EIP-6963 Provider announced with RDNS:",
    providerInfo.rdns,
  );
});
