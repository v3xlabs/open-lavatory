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
        <div className="flex items-center justify-between rounded-lg border border-[var(--vocs-color_codeInlineBorder)] bg-[var(--vocs-color_codeBlockBackground)] px-4 py-2">
            <div>Connected to {trimAddress(address)}</div>
            <button
                onClick={() => {
                    disconnect();
                }}
                className="!bg-[var(--vocs-color_codeTitleBackground)] hover:!bg-[var(--vocs-color_codeBlockBackground)] rounded-lg border border-[var(--vocs-color_codeInlineBorder)] px-4 py-1"
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
            <div className="mt-4 space-y-2 p-2">
                <ul className="mx-auto w-full max-w-xs space-y-2">
                    {connectors.map((connector) => (
                        <li key={connector.id} className="">
                            <button
                                onClick={() => {
                                    connect({ connector: connector });
                                }}
                                className={classNames(
                                    '!bg-[var(--vocs-color_codeBlockBackground)] flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm',
                                    connector.type === 'openLv'
                                        ? 'hover:!bg-[var(--vocs-color_backgroundAccent)]/10 border border-[var(--vocs-color_codeInlineText)]'
                                        : 'hover:!bg-[var(--vocs-color_codeHighlightBackground)]'
                                )}
                            >
                                <span
                                    className={classNames(
                                        'font-bold text-sm',
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
                                        className="h-10 w-10 rounded-md"
                                    />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-full rounded-b-md border-[var(--vocs-color_codeInlineBorder)] border-t bg-[var(--vocs-color_codeBlockBackground)] px-4 py-2">
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
            className="rounded-lg border border-[var(--vocs-color_codeInlineBorder)]"
            suppressHydrationWarning
        >
            {inBrowser && <Outter />}
        </div>
    );
};
