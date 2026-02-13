import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const config = createConfig({
  multiInjectedProviderDiscovery: true,
  transports: {
    // eslint-disable-next-line no-restricted-syntax
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
  chains: [sepolia],
});
