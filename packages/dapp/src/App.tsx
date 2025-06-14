import { useEffect, useState } from 'react';
import {
    useAccount,
    useBalance,
    useChainId,
    useConnect,
    useDisconnect,
    useSwitchChain,
} from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';

interface WalletInfo {
    address: string;
    ensName?: string;
    connector: string;
    chainId: number;
    isConnected: boolean;
}

const App = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const { address, isConnected, connector } = useAccount();
    const { connectors, connect, error: connectError, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain, chains } = useSwitchChain();
    const chainId = useChainId();
    const { data: balance, isLoading: balanceLoading } = useBalance({
        address,
    });

    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

    useEffect(() => {
        if (isConnected && address && connector) {
            setWalletInfo({
                address,
                connector: connector.name,
                chainId,
                isConnected,
            });
        } else {
            setWalletInfo(null);
        }
    }, [isConnected, address, connector, chainId]);

    const refreshWallets = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatBalance = (bal: { formatted: string; symbol: string } | undefined) => {
        if (!bal) return '0';

        const value = Number(bal.formatted);

        if (value === 0) return '0';

        if (value < 0.0001) return '< 0.0001';

        return value.toFixed(4);
    };

    const getChainName = (id: number) => {
        const chain = chains.find((c) => c.id === id);

        return chain?.name || `Chain ${id}`;
    };

    const getChainColor = (id: number) => {
        const colors: Record<number, string> = {
            [mainnet.id]: 'bg-blue-500',
            [sepolia.id]: 'bg-purple-500',
            [arbitrum.id]: 'bg-blue-600',
            [base.id]: 'bg-indigo-500',
            [optimism.id]: 'bg-red-500',
            [polygon.id]: 'bg-purple-600',
        };

        return colors[id] || 'bg-gray-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800 mb-2">
                                🚀 Wallet Sandbox
                            </h1>
                            <p className="text-slate-600">
                                Beautiful wagmi-powered wallet connection demo
                            </p>
                        </div>
                        <button
                            onClick={refreshWallets}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-3 h-3 rounded-full ${
                                isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`}
                        ></div>
                        <span className="text-sm font-medium text-slate-600">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                        {isConnected && (
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {connector?.name}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Available Wallets */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <svg
                                className="w-6 h-6 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            Available Wallets ({connectors.length})
                        </h2>

                        <div className="space-y-3">
                            {connectors.map((conn) => (
                                <div
                                    key={`${conn.id}-${refreshKey}`}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {conn.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800">
                                                {conn.name}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {conn.type} • {conn.id}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => connect({ connector: conn })}
                                        disabled={isPending || isConnected}
                                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                    >
                                        {isPending ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {connectError && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">
                                    <span className="font-medium">Connection Error:</span>{' '}
                                    {connectError.message}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Wallet Information */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <svg
                                className="w-6 h-6 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            Wallet Information
                        </h2>

                        {walletInfo ? (
                            <div className="space-y-6">
                                {/* Address */}
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <label className="text-sm font-medium text-slate-600 block mb-2">
                                        Address
                                    </label>
                                    <div className="flex items-center justify-between">
                                        <code className="text-sm font-mono text-slate-800">
                                            {formatAddress(walletInfo.address)}
                                        </code>
                                        <button
                                            onClick={() =>
                                                navigator.clipboard.writeText(walletInfo.address)
                                            }
                                            className="text-blue-500 hover:text-blue-700 text-sm"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Balance */}
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <label className="text-sm font-medium text-slate-600 block mb-2">
                                        Balance
                                    </label>
                                    <div className="text-2xl font-bold text-slate-800">
                                        {balanceLoading ? (
                                            <div className="animate-pulse bg-slate-200 h-8 w-32 rounded"></div>
                                        ) : (
                                            `${formatBalance(balance)} ${balance?.symbol || 'ETH'}`
                                        )}
                                    </div>
                                </div>

                                {/* Current Chain */}
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <label className="text-sm font-medium text-slate-600 block mb-2">
                                        Current Chain
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-3 h-3 rounded-full ${getChainColor(
                                                chainId
                                            )}`}
                                        ></div>
                                        <span className="font-semibold text-slate-800">
                                            {getChainName(chainId)}
                                        </span>
                                        <span className="text-xs text-slate-500">#{chainId}</span>
                                    </div>
                                </div>

                                {/* Disconnect Button */}
                                <button
                                    onClick={() => disconnect()}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl transition-colors duration-200 font-medium"
                                >
                                    Disconnect Wallet
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-slate-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                    No Wallet Connected
                                </h3>
                                <p className="text-slate-600">
                                    Connect a wallet to see your account information
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Available Chains */}
                {isConnected && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mt-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <svg
                                className="w-6 h-6 text-purple-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                            </svg>
                            Available Chains ({chains.length})
                        </h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {chains.map((chain) => (
                                <div
                                    key={chain.id}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                        chain.id === chainId
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-3 h-3 rounded-full ${getChainColor(
                                                    chain.id
                                                )}`}
                                            ></div>
                                            <h3 className="font-semibold text-slate-800">
                                                {chain.name}
                                            </h3>
                                        </div>
                                        {chain.id === chainId && (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Chain ID: {chain.id} • {chain.nativeCurrency.symbol}
                                    </p>
                                    {chain.id !== chainId && (
                                        <button
                                            onClick={() => switchChain({ chainId: chain.id })}
                                            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                                        >
                                            Switch to {chain.name}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 text-slate-500">
                    <p className="text-sm">
                        Built with ❤️ using{' '}
                        <span className="font-semibold text-blue-500">wagmi</span>,{' '}
                        <span className="font-semibold text-blue-500">viem</span>, and{' '}
                        <span className="font-semibold text-blue-500">React</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export { App };
