/* eslint-disable no-restricted-syntax */
import { openlv } from '@openlv/connector';
import { injected, metaMask, walletConnect } from '@wagmi/connectors';
import { createConfig, http } from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';

export const config = createConfig({
    chains: [mainnet, sepolia, arbitrum, base, optimism, polygon],
    connectors: [
        injected(),
        walletConnect({
            projectId: 'demo-project-id', // Replace with actual project ID
        }),
        openlv({}),
        metaMask(),
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
