import { openlv } from "@openlv/connector"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, WagmiProvider, createConfig, useConnect, useAccount, useDisconnect } from "wagmi"
import { mainnet } from "wagmi/chains"
import { match } from "ts-pattern"
import "../styles.css"
import { Address } from "viem"

const queryClient = new QueryClient();

const config = createConfig({
    chains: [mainnet],
    connectors: [openlv()],
    transports: {
        [mainnet.id]: http(),
    },
})

const trimAddress = (address: Address | undefined | null) => {
    if (!(typeof address === 'string')) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

const Connected = () => {
    const { disconnect } = useDisconnect();
    const { address } = useAccount();

    return (
        <div className="bg-[var(--vocs-color_codeBlockBackground)] rounded-lg px-4 py-2 border border-[var(--vocs-color_codeInlineBorder)] flex items-center justify-between">
            <div>Connected to {trimAddress(address)}</div>
            <button
                onClick={() => {
                    disconnect();
                }}
                className="border border-[var(--vocs-color_codeInlineBorder)] !bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg px-4 py-1"
            >
                Disconnect
            </button>
        </div>
    )
}

const Connectors = () => {
    const { connect, connectors } = useConnect();

    return (
        <>
            <div className="text-sm px-2 font-bold text-[var(--vocs-color_codeTitle)]">Available Connectors:</div>
            <ul>
                {connectors.map((connector) => (
                    <li key={connector.id} className="mb-2 flex items-center justify-between border pr-2 pl-4 py-2 rounded-md border-[var(--vocs-color_codeInlineBorder)]">
                        <div className="text-sm">{connector.name}</div>
                        <button
                            onClick={() => {
                                connect({ connector: connector })
                            }}
                            className="border border-[var(--vocs-color_codeInlineBorder)] !bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg px-4 py-2 text-sm"
                        >
                            Connect
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}

export const Inner = () => {
    const { isConnected } = useAccount();

    return (
        <div className="space-y-2">
            {match(isConnected)
                .with(true, () => (
                    <Connected />
                ))
                .with(false, () => (
                    <Connectors />
                ))
                .exhaustive()}
        </div>
    )
}

export const TryItOut = () => {
    return (
        <div className="border border-[var(--vocs-color_codeInlineBorder)] rounded-lg px-3 pb-2 pt-4">
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>
                    <Inner />
                </WagmiProvider>
            </QueryClientProvider>
        </div>
    )
}
