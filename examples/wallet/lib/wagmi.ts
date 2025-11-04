import { createConfig, http } from "wagmi";
import { anvil } from "wagmi/chains";

export const config = createConfig({
  multiInjectedProviderDiscovery: false,
  transports: {
    // eslint-disable-next-line no-restricted-syntax
    [anvil.id]: http("http://localhost:8545"),
  },
  chains: [anvil],
  connectors: [],
});
