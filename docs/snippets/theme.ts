import { openlv } from "@openlv/connector"; // [!code ++]
import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    openlv({
      theme: {
        theme: "simple", // [!code ++]
        mode: "light", // [!code ++]
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
});
