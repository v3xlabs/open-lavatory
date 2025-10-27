/* eslint-disable no-restricted-syntax */
import '../styles.css';

import { openlv } from '@openlv/connector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import classNames from 'classnames';
import { match } from 'ts-pattern';
import type { Address } from 'viem';
import { createConfig, http, useAccount, useConnect, useDisconnect, WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';

const queryClient = new QueryClient();

const config = createConfig({
    chains: [mainnet],
    connectors: [openlv()],
    transports: {
        [mainnet.id]: http(),
    },
});

const trimAddress = (address: Address | undefined | null) => {
    if (!(typeof address === 'string')) return address;

    return `${address.slice(0, 5)}...${address.slice(-4)}`;
};

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
    );
};

const Connectors = () => {
    const { connect, connectors } = useConnect();

    return (
        <>
            <div className="space-y-2 p-2 mt-4">
                <ul className="space-y-2 mx-auto w-full max-w-xs">
                    {connectors.map((connector) => (
                        <li key={connector.id} className="">
                            <button
                                onClick={() => {
                                    connect({ connector: connector });
                                }}
                                className={classNames(
                                    '!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg px-4 py-2 text-sm w-full flex justify-between items-center',
                                    connector.type === 'openLv'
                                        ? 'border border-[var(--vocs-color_codeInlineText)] hover:!bg-[var(--vocs-color_backgroundAccent)]/10'
                                        : 'hover:!bg-[var(--vocs-color_codeHighlightBackground)]'
                                )}
                            >
                                <span
                                    className={classNames(
                                        'text-sm font-bold',
                                        connector.type === 'openLv' &&
                                            'text-[var(--vocs-color_codeInlineText)]'
                                    )}
                                >
                                    {connector.name}
                                </span>
                                {connector.icon && (
                                    <img
                                        src={connector.icon}
                                        alt={`${connector.name} icon`}
                                        className="w-12 h-12"
                                    />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-full bg-[var(--vocs-color_codeBlockBackground)] px-4 py-2 border-t border-[var(--vocs-color_codeInlineBorder)] rounded-b-md">
                <div>The above is a sample wagmi snippet</div>
            </div>
        </>
    );
};

export const Inner = () => {
    const { isConnected } = useAccount();

    return (
        <div className="space-y-2">
            {match(isConnected)
                .with(true, () => <Connected />)
                .with(false, () => <Connectors />)
                .exhaustive()}
        </div>
    );
};

export const Outter = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <WagmiProvider config={config}>
                <Inner />
            </WagmiProvider>
        </QueryClientProvider>
    );
};

export const TryItOut = () => {
    const inBrowser = typeof window !== 'undefined';

    return (
        <div
            className="border border-[var(--vocs-color_codeInlineBorder)] rounded-lg"
            suppressHydrationWarning
        >
            {inBrowser && <Outter />}
        </div>
    );
};
