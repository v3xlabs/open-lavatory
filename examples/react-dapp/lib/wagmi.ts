/* eslint-disable no-restricted-syntax */
import { openlv } from "@openlv/connector";
import { injected } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet, sepolia, arbitrum, base, optimism, polygon],
  connectors: [
    injected(),
    // @deprecated and has security warnings
    // walletConnect({
    //   projectId: "demo-project-id", // Replace with actual project ID
    // }),
    openlv({
      theme: {
        theme: "simple",
      },
    }),
    // @deprecated cuz auto triggers analytics on js injection :'(
    // metaMask(),
  ],
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
});
