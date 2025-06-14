import { injected, metaMask, walletConnect } from '@wagmi/connectors';
import { createConfig, http } from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';

export const config = createConfig({
    chains: [mainnet, sepolia, arbitrum, base, optimism, polygon],
    connectors: [
        injected(),
        metaMask(),
        walletConnect({
            projectId: 'demo-project-id', // Replace with actual project ID
        }),
    ],
    multiInjectedProviderDiscovery: true,
    transports: {
        [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/demo'),
        [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
        [arbitrum.id]: http('https://arb-mainnet.g.alchemy.com/v2/demo'),
        [base.id]: http('https://base-mainnet.g.alchemy.com/v2/demo'),
        [optimism.id]: http('https://opt-mainnet.g.alchemy.com/v2/demo'),
        [polygon.id]: http('https://polygon-rpc.com'),
    },
});
