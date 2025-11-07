import { openlv } from "@openlv/connector";
import type { OpenLVProvider } from "@openlv/provider";

declare global {
  interface Window {
    openlv: OpenLVProvider;
    ethereum: OpenLVProvider;
  }
}

// eslint-disable-next-line import/no-default-export
export default defineUnlistedScript(() => {
  console.log("INJECTED HERE");

  // Prevent multiple injections
  //   if (window.openlv?.isOpenLV) {
  //     return;
  //   }

  console.log("OpenLV EIP-6963 Provider Injected");

  const connector = openlv({})({ chains: [] } as any);

  console.log("connector", connector);
  // @ts-ignore
  const provider = connector.getProvider();

  // // Expose provider globally
  window.openlv = provider;

  // // For backwards compatibility, also expose as window.ethereum if not already set
  if (!window.ethereum) {
    window.ethereum = provider;
  }

  // // EIP-6963 Provider Info
  // const providerInfo = {
  //   uuid: crypto.randomUUID(),
  //   name: "Open Lavatory",
  //   icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle fill="%23663399" cx="16" cy="16" r="16"/><text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">OL</text></svg>',
  //   rdns: "io.openlv.wallet",
  // };
  const { uuid, name, icon, rdns } = connector;
  const providerInfo = { uuid, name, icon, rdns };

  // EIP-6963 Provider Detail
  const providerDetail = Object.freeze({
    info: providerInfo,
    provider: provider,
  });

  // Announce provider
  function announceProvider() {
    const event = new CustomEvent("eip6963:announceProvider", {
      detail: providerDetail,
    });

    window.dispatchEvent(event);
  }

  // Listen for provider requests
  window.addEventListener("eip6963:requestProvider", announceProvider);

  // Announce immediately
  announceProvider();

  console.log(
    "OpenLV EIP-6963 Provider announced with RDNS:",
    providerInfo.rdns,
  );
});
