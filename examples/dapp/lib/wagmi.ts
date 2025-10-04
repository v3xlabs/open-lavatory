import { injected, metaMask, walletConnect } from '@wagmi/connectors';
import { openlv } from '@openlv/connector';
import { createConfig } from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';
import { createConnector, http } from 'wagmi';

export const config = createConfig({
    chains: [mainnet, sepolia, arbitrum, base, optimism, polygon],
    connectors: [
        injected(),
        metaMask(),
        // walletConnect({
        //     projectId: 'demo-project-id', // Replace with actual project ID
        // }),
        openlv(),
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
