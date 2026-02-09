import { openlv } from "@openlv/connector"; // [!code ++]
import { simpleTheme } from "@openlv/modal/theme"; // [!code ++]
import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    openlv({
      theme: { // [!code ++]
        // You can extend a base theme and customize specific properties // [!code ++]
        theme: { // [!code ++]
          ...simpleTheme, // [!code ++]
          light: { // [!code ++]
            ...simpleTheme.light, // [!code ++]
            body: { // [!code ++]
              background: "orange", // [!code ++]
              color: "white", // [!code ++]
            }, // [!code ++]
          }, // [!code ++]
        }, // [!code ++]
        mode: "light", // [!code ++]
      }, // [!code ++]
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
});
