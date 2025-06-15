import type { ConnectionPhase } from 'lib';
import { OpenLVConnection } from 'lib';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';

interface WalletAccount {
    address: string;
    privateKey: string;
    publicKey: string;
    createdAt: number;
    balance?: string;
    isLoadingBalance?: boolean;
}

interface WalletData {
    accounts: WalletAccount[];
    activeAccountIndex: number;
    version: string;
}

const generateEthereumAccount = async (): Promise<WalletAccount> => {
    const privateKeyArray = new Uint8Array(32);
    crypto.getRandomValues(privateKeyArray);

    const privateKey =
        '0x' +
        Array.from(privateKeyArray)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    const hashArray = await crypto.subtle.digest('SHA-256', privateKeyArray);
    const hashBytes = new Uint8Array(hashArray);
    const address =
        '0x' +
        Array.from(hashBytes.slice(-20))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    const publicKeyArray = await crypto.subtle.digest('SHA-256', privateKeyArray);
    const publicKeyBytes = new Uint8Array(publicKeyArray);
    const publicKey =
        '0x04' +
        Array.from(publicKeyBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

    return { address, privateKey, publicKey, createdAt: Date.now() };
};

// Create viem client for balance fetching
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(), // Using demo key, replace with your own
});

const useWalletStorage = () => {
    const [walletData, setWalletData] = useState<WalletData>({
        accounts: [],
        activeAccountIndex: 0,
        version: '1.0.0',
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const STORAGE_KEY = 'openlv_wallet_data';

    const updateWallet = useCallback((newData: WalletData) => {
        setWalletData(newData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }, []);

    const fetchBalance = useCallback(async (address: string, accountIndex: number) => {
        try {
            // Set loading state
            setWalletData((prev) => ({
                ...prev,
                accounts: prev.accounts.map((acc, idx) =>
                    idx === accountIndex ? { ...acc, isLoadingBalance: true } : acc
                ),
            }));

            const balance = await publicClient.getBalance({
                address: address as `0x${string}`,
            });

            const formattedBalance = formatEther(balance);

            setWalletData((prev) => {
                const newData = {
                    ...prev,
                    accounts: prev.accounts.map((acc, idx) =>
                        idx === accountIndex
                            ? { ...acc, balance: formattedBalance, isLoadingBalance: false }
                            : acc
                    ),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
                return newData;
            });
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            setWalletData((prev) => ({
                ...prev,
                accounts: prev.accounts.map((acc, idx) =>
                    idx === accountIndex
                        ? { ...acc, balance: 'Error', isLoadingBalance: false }
                        : acc
                ),
            }));
        }
    }, []);

    const refreshAllBalances = useCallback(async () => {
        for (let i = 0; i < walletData.accounts.length; i++) {
            await fetchBalance(walletData.accounts[i].address, i);
        }
    }, [walletData.accounts, fetchBalance]);

    const initializeWallet = useCallback(async () => {
        if (isInitialized) return walletData;
        setIsLoading(true);

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsedData: WalletData = JSON.parse(stored);
                if (parsedData.accounts?.length) {
                    const validActiveIndex = Math.min(
                        parsedData.activeAccountIndex || 0,
                        parsedData.accounts.length - 1
                    );
                    const correctedData = { ...parsedData, activeAccountIndex: validActiveIndex };
                    setWalletData(correctedData);
                    setIsInitialized(true);
                    setIsLoading(false);

                    // Fetch balances for existing accounts
                    setTimeout(() => {
                        correctedData.accounts.forEach((_, index) => {
                            fetchBalance(correctedData.accounts[index].address, index);
                        });
                    }, 100);

                    return correctedData;
                }
            }

            const firstAccount = await generateEthereumAccount();
            const newWalletData: WalletData = {
                accounts: [firstAccount],
                activeAccountIndex: 0,
                version: '1.0.0',
            };
            updateWallet(newWalletData);
            setIsInitialized(true);
            setIsLoading(false);

            // Fetch balance for the new account
            setTimeout(() => fetchBalance(firstAccount.address, 0), 100);

            return newWalletData;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    }, [walletData, isInitialized, updateWallet, fetchBalance]);

    const addAccount = useCallback(async () => {
        const newAccount = await generateEthereumAccount();
        const updatedData = { ...walletData, accounts: [...walletData.accounts, newAccount] };
        updateWallet(updatedData);

        // Fetch balance for the new account
        const newIndex = walletData.accounts.length;
        setTimeout(() => fetchBalance(newAccount.address, newIndex), 100);

        return newAccount;
    }, [walletData, updateWallet, fetchBalance]);

    const setActiveAccount = useCallback(
        (arrayIndex: number) => {
            if (arrayIndex >= 0 && arrayIndex < walletData.accounts.length) {
                updateWallet({ ...walletData, activeAccountIndex: arrayIndex });
            }
        },
        [walletData, updateWallet]
    );

    const removeAccount = useCallback(
        (arrayIndex: number) => {
            if (
                walletData.accounts.length <= 1 ||
                arrayIndex < 0 ||
                arrayIndex >= walletData.accounts.length
            )
                return;

            const updatedAccounts = walletData.accounts.filter((_, i) => i !== arrayIndex);
            let newActiveIndex = walletData.activeAccountIndex;

            if (arrayIndex === walletData.activeAccountIndex) {
                newActiveIndex = Math.max(0, arrayIndex - 1);
            } else if (arrayIndex < walletData.activeAccountIndex) {
                newActiveIndex = walletData.activeAccountIndex - 1;
            }

            newActiveIndex = Math.min(newActiveIndex, updatedAccounts.length - 1);
            updateWallet({
                ...walletData,
                accounts: updatedAccounts,
                activeAccountIndex: newActiveIndex,
            });
        },
        [walletData, updateWallet]
    );

    return {
        accounts: walletData.accounts,
        activeAccount: walletData.accounts[walletData.activeAccountIndex] || null,
        activeAccountIndex: walletData.activeAccountIndex,
        isInitialized,
        isLoading,
        initializeWallet,
        addAccount,
        removeAccount,
        setActiveAccount,
        refreshAllBalances,
        fetchBalance,
        getAddresses: () => walletData.accounts.map((acc) => acc.address),
    };
};

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20 border border-white/20'
            }`}
            title={`Copy ${label || 'text'}`}
        >
            {copied ? (
                <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                    Copy
                </>
            )}
        </button>
    );
};

const BalanceDisplay = ({
    account,
    index,
    onRefresh,
}: {
    account: WalletAccount;
    index: number;
    onRefresh: (address: string, index: number) => void;
}) => {
    const formatBalance = (balance: string) => {
        if (balance === 'Error') return 'Error';
        if (!balance) return '0.000';

        const num = parseFloat(balance);
        if (num === 0) return '0.000';
        if (num < 0.001) return '<0.001';
        if (num < 1) return num.toFixed(6);
        if (num < 100) return num.toFixed(4);
        return num.toFixed(2);
    };

    const getBalanceColor = (balance: string) => {
        if (balance === 'Error') return 'text-red-400';
        const num = parseFloat(balance || '0');
        if (num === 0) return 'text-slate-400';
        if (num < 0.1) return 'text-amber-400';
        return 'text-emerald-400';
    };

    return (
        <div className="flex items-center gap-3">
            <div className="text-right">
                {account.isLoadingBalance ? (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                        <span className="text-purple-200 text-sm">Loading...</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div
                            className={`text-lg font-semibold ${getBalanceColor(account.balance || '0')}`}
                        >
                            {formatBalance(account.balance || '0')} ETH
                        </div>
                        <div className="text-xs text-purple-300">
                            ${(parseFloat(account.balance || '0') * 2350).toFixed(2)} USD
                        </div>
                    </div>
                )}
            </div>
            <button
                onClick={() => onRefresh(account.address, index)}
                disabled={account.isLoadingBalance}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 transition-all disabled:opacity-50"
                title="Refresh balance"
            >
                <svg
                    className={`w-4 h-4 ${account.isLoadingBalance ? 'animate-spin' : ''}`}
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
            </button>
        </div>
    );
};

const App = () => {
    const [openLVUrl, setOpenLVUrl] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<
        'disconnected' | 'mqtt-only' | 'webrtc-connected'
    >('disconnected');
    const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [connectedAsUrl, setConnectedAsUrl] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    const [showWalletDetails, setShowWalletDetails] = useState(false);
    const connectionRef = useRef<OpenLVConnection | null>(null);
    const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const {
        accounts,
        activeAccount,
        activeAccountIndex,
        isInitialized,
        isLoading,
        initializeWallet,
        addAccount,
        removeAccount,
        setActiveAccount,
        refreshAllBalances,
        fetchBalance,
        getAddresses,
    } = useWalletStorage();

    useEffect(() => {
        initializeWallet().catch(console.error);
        return () => {
            if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
            if (connectionRef.current) connectionRef.current.disconnect();
        };
    }, [initializeWallet]);

    const addMessage = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setMessages((prev) => [...prev.slice(-19), `[${timestamp}] ${msg}`]);
    }, []);

    const createMessageHandler = () => (request: any) => {
        if (typeof request === 'string') {
            try {
                const parsed = JSON.parse(request);
                if (parsed.jsonrpc === '2.0' && parsed.method) request = parsed;
                else {
                    addMessage(`📨 ${request}`);
                    return { status: 'received' };
                }
            } catch {
                addMessage(`📨 ${request}`);
                return { status: 'received' };
            }
        }

        if (request?.method === 'lv_rawText') {
            try {
                const innerRequest = JSON.parse(request.params?.[0] || '{}');
                if (
                    innerRequest.method === 'eth_requestAccounts' ||
                    innerRequest.method === 'eth_accounts'
                ) {
                    const addresses = getAddresses();
                    addMessage(`🔐 ${innerRequest.method} → ${addresses.length} account(s)`);
                    setTimeout(
                        () =>
                            connectionRef.current?.sendMessage(
                                JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: innerRequest.id,
                                    result: addresses,
                                })
                            ),
                        100
                    );
                    return { status: 'processing' };
                } else if (innerRequest.method === 'eth_chainId') {
                    addMessage(`🔗 eth_chainId → 0x1`);
                    setTimeout(
                        () =>
                            connectionRef.current?.sendMessage(
                                JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: innerRequest.id,
                                    result: '0x1',
                                })
                            ),
                        100
                    );
                    return { status: 'processing' };
                }
            } catch {
                addMessage(`📨 ${request.params?.[0] || 'Empty'}`);
            }
        }
        return { status: 'unsupported' };
    };

    const startConnection = async (isInitiator: boolean) => {
        if (!isInitialized) await initializeWallet();
        setIsConnecting(true);

        try {
            const connection = new OpenLVConnection();
            connectionRef.current = connection;

            connection.onPhaseChange((phase) => {
                setConnectionPhase(phase);
                const icons = {
                    'mqtt-connecting': '🔗',
                    'mqtt-connected': '📡',
                    pairing: '🤝',
                    'key-exchange': '🔐',
                    'webrtc-negotiating': '⚡',
                    'webrtc-connected': '✅',
                };
                addMessage(`${icons[phase.state] || '❌'} ${phase.description}`);
            });

            connection.onMessage(createMessageHandler());

            if (isInitiator) {
                const { openLVUrl } = await connection.initSession();
                setOpenLVUrl(openLVUrl);
            } else {
                await connection.connectToSession(connectedAsUrl.trim());
            }

            statusIntervalRef.current = setInterval(() => {
                if (connectionRef.current) {
                    const status = connectionRef.current.getConnectionStatus();
                    setConnectionStatus(status);
                    setIsConnecting(
                        status === 'mqtt-only' &&
                            ['pairing', 'key-exchange', 'webrtc-negotiating'].includes(
                                connectionRef.current.getConnectionState()
                            )
                    );
                }
            }, 1000);
        } catch (error) {
            addMessage(`❌ Connection failed`);
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
        if (connectionRef.current) connectionRef.current.disconnect();
        setConnectionStatus('disconnected');
        setConnectionPhase(null);
        setIsConnecting(false);
        setOpenLVUrl('');
        setConnectedAsUrl('');
        setMessages([]);
    };

    const sendMessage = () => {
        if (!inputMessage.trim() || !connectionRef.current) return;
        connectionRef.current.sendMessage(inputMessage.trim());
        addMessage(`📤 ${inputMessage.trim()}`);
        setInputMessage('');
    };

    const sendTestRequest = (method: string) => {
        if (!connectionRef.current) return;
        const request = { jsonrpc: '2.0', id: Date.now(), method, params: [] };
        connectionRef.current.sendMessage(JSON.stringify(request));
        addMessage(`🧪 Test ${method} sent`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-purple-200 text-lg font-medium">Initializing Wallet...</p>
                </div>
            </div>
        );
    }

    const statusColors = {
        'webrtc-connected': 'text-emerald-400',
        'mqtt-only': 'text-amber-400',
        disconnected: 'text-slate-400',
    };

    const statusIcons = {
        'webrtc-connected': '✅ Direct P2P',
        'mqtt-only': '📡 Relay Mode',
        disconnected: '❌ Disconnected',
    };

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">LV</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                OpenLV Wallet
                            </h1>
                            <p className="text-purple-300 text-sm">Ethereum Mainnet</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {['Wallet Details', 'Debug Mode'].map((label, i) => {
                            const isActive = i === 0 ? showWalletDetails : debugMode;
                            const onClick =
                                i === 0
                                    ? () => setShowWalletDetails(!showWalletDetails)
                                    : () => setDebugMode(!debugMode);
                            return (
                                <button
                                    key={label}
                                    onClick={onClick}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-purple-500 text-white shadow-lg'
                                            : 'bg-white/10 text-purple-200 hover:bg-white/20'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Total Portfolio Value */}
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg text-purple-200 mb-2">Total Portfolio Value</h2>
                            <div className="text-4xl font-bold text-white mb-1">
                                {totalBalance.toFixed(4)} ETH
                            </div>
                            <div className="text-xl text-purple-200">
                                ${(totalBalance * 2350).toFixed(2)} USD
                            </div>
                        </div>
                        <button
                            onClick={refreshAllBalances}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                        >
                            Refresh All
                        </button>
                    </div>
                </div>

                {/* Wallet Status */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Wallet Accounts</h2>
                        <div className="flex items-center gap-4">
                            <span className="text-purple-200">
                                {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={addAccount}
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
                            >
                                + Add Account
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {accounts.map((account, index) => (
                            <div
                                key={account.address}
                                className={`p-5 rounded-xl border transition-all ${
                                    index === activeAccountIndex
                                        ? 'bg-purple-500/20 border-purple-400 shadow-lg'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-purple-200 text-sm font-medium">
                                                Account {index + 1}
                                            </span>
                                            {index === activeAccountIndex && (
                                                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="font-mono text-sm text-white break-all flex-1">
                                                {account.address}
                                            </div>
                                            <CopyButton text={account.address} label="address" />
                                        </div>

                                        {(debugMode || showWalletDetails) && (
                                            <div className="mt-4 p-3 bg-black/20 rounded-lg text-xs text-purple-200 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-purple-300 font-medium">
                                                        Private Key:
                                                    </span>
                                                    <span className="font-mono">
                                                        {account.privateKey.substring(0, 20)}...
                                                    </span>
                                                    <CopyButton
                                                        text={account.privateKey}
                                                        label="private key"
                                                    />
                                                </div>
                                                <div>
                                                    Created:{' '}
                                                    {new Date(
                                                        account.createdAt
                                                    ).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 ml-6">
                                        <BalanceDisplay
                                            account={account}
                                            index={index}
                                            onRefresh={fetchBalance}
                                        />

                                        <div className="flex flex-col gap-2">
                                            {index !== activeAccountIndex && (
                                                <button
                                                    onClick={() => setActiveAccount(index)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                            {accounts.length > 1 && (
                                                <button
                                                    onClick={() => removeAccount(index)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Connection Status */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Connection</h2>
                        <div className="flex items-center gap-3">
                            {isConnecting && (
                                <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                            )}
                            <span className={`font-medium ${statusColors[connectionStatus]}`}>
                                {statusIcons[connectionStatus]}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Connection Controls */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Create Session */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Create Session</h3>
                        <button
                            onClick={() => startConnection(true)}
                            disabled={connectionStatus !== 'disconnected'}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4"
                        >
                            Initialize Session
                        </button>

                        {openLVUrl && (
                            <div className="space-y-4">
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="text-sm text-purple-200 mb-2">
                                        Connection URL:
                                    </div>
                                    <div className="text-xs text-white/80 break-all bg-black/20 p-2 rounded">
                                        {openLVUrl}
                                    </div>
                                </div>
                                <div className="flex justify-center bg-white p-4 rounded-xl">
                                    <QRCodeSVG value={openLVUrl} size={160} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Join Session */}
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Join Session</h3>
                        <input
                            type="text"
                            value={connectedAsUrl}
                            onChange={(e) => setConnectedAsUrl(e.target.value)}
                            placeholder="Paste connection URL..."
                            disabled={connectionStatus !== 'disconnected'}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-purple-200 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={() => startConnection(false)}
                            disabled={!connectedAsUrl.trim() || connectionStatus !== 'disconnected'}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Connect to Session
                        </button>
                    </div>
                </div>

                {/* Messaging Interface */}
                {connectionStatus !== 'disconnected' && (
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Messages & Testing</h3>
                            <div className="flex gap-2">
                                {['eth_requestAccounts', 'eth_chainId'].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => sendTestRequest(method)}
                                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-all"
                                    >
                                        Test {method.split('_')[1]}
                                    </button>
                                ))}
                                <button
                                    onClick={disconnect}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-all"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-4 h-48 overflow-y-auto mb-4 space-y-1">
                            {messages.length === 0 ? (
                                <p className="text-purple-200 text-center py-8">
                                    No messages yet...
                                </p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className="text-sm font-mono text-purple-100">
                                        {message}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim()}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export { App };
