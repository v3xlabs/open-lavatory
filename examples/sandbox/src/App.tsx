/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable max-lines */

import type { ConnectionPhase } from '@openlv/transport';
import { OpenLVConnection } from '@openlv/transport';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Wallet interface
interface WalletAccount {
    address: string;
    privateKey: string;
    publicKey: string;
}

// Simple Ethereum address derivation (simplified - in production use ethers.js or web3.js)
const generateEthereumAccount = async (): Promise<WalletAccount> => {
    // Generate a cryptographically secure private key
    const privateKeyArray = new Uint8Array(32);

    crypto.getRandomValues(privateKeyArray);

    // Convert to hex string
    const privateKey =
        '0x' +
        Array.from(privateKeyArray)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

    // For demo purposes, create a mock address derived from private key
    // In production, you'd use proper keccak256 hashing and secp256k1 public key derivation
    const hashArray = await crypto.subtle.digest('SHA-256', privateKeyArray);
    const hashBytes = new Uint8Array(hashArray);
    const address =
        '0x' +
        Array.from(hashBytes.slice(-20))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

    // Mock public key for completeness
    const publicKey =
        '0x04' +
        Array.from(hashBytes.slice(0, 32))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

    return { address, privateKey, publicKey };
};

// Wallet storage hook (in-memory for Claude.ai, adaptable to localStorage)
const useWalletStorage = () => {
    const [accounts, setAccounts] = useState<WalletAccount[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize wallet (create first account if none exist)
    const initializeWallet = useCallback(async () => {
        if (isInitialized) return accounts;

        // In a real implementation with localStorage:
        // const stored = localStorage.getItem('wallet_accounts');
        // if (stored) {
        //     const parsedAccounts = JSON.parse(stored);
        //     setAccounts(parsedAccounts);
        //     setIsInitialized(true);
        //     return parsedAccounts;
        // }

        // Generate first account
        const firstAccount = await generateEthereumAccount();
        const newAccounts = [firstAccount];

        setAccounts(newAccounts);
        setIsInitialized(true);

        // In a real implementation:
        // localStorage.setItem('wallet_accounts', JSON.stringify(newAccounts));

        return newAccounts;
    }, [accounts, isInitialized]);

    // Add new account
    const addAccount = useCallback(async () => {
        const newAccount = await generateEthereumAccount();
        const updatedAccounts = [...accounts, newAccount];

        setAccounts(updatedAccounts);

        // In a real implementation:
        // localStorage.setItem('wallet_accounts', JSON.stringify(updatedAccounts));

        return newAccount;
    }, [accounts]);

    // Get addresses only (for eth_requestAccounts response)
    const getAddresses = useCallback(() => {
        return accounts.map((account) => account.address);
    }, [accounts]);

    return {
        accounts,
        initializeWallet,
        addAccount,
        getAddresses,
        isInitialized,
    };
};

const App = () => {
    const [openLVUrl, setOpenLVUrl] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<
        'disconnected' | 'mqtt-only' | 'webrtc-connected'
    >('disconnected');
    const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [connectedAsUrl, setConnectedAsUrl] = useState<string>('');
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>(
        'excellent'
    );
    const [isConnecting, setIsConnecting] = useState(false);
    const [debugMode, setDebugMode] = useState(false);
    const connectionRef = useRef<OpenLVConnection | null>(null);
    const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize wallet storage
    const { accounts, initializeWallet, addAccount, getAddresses, isInitialized } =
        useWalletStorage();

    // Initialize wallet on component mount
    useEffect(() => {
        initializeWallet();
    }, [initializeWallet]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
            }

            if (connectionRef.current) {
                connectionRef.current.disconnect();
            }
        };
    }, []);

    // Monitor connection status
    const startStatusMonitoring = () => {
        if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
        }

        statusIntervalRef.current = setInterval(() => {
            if (connectionRef.current) {
                const status = connectionRef.current.getConnectionStatus();

                setConnectionStatus(status);

                // Update connection quality based on status
                if (status === 'webrtc-connected') {
                    setConnectionQuality('excellent');
                    setIsConnecting(false);
                } else if (status === 'mqtt-only') {
                    setConnectionQuality('good');
                    // Keep connecting state based on phase
                    const currentState = connectionRef.current.getConnectionState();

                    setIsConnecting(
                        ['pairing', 'key-exchange', 'webrtc-negotiating'].includes(currentState)
                    );
                } else {
                    setConnectionQuality('poor');
                    setIsConnecting(false);
                }
            }
        }, 1000);
    };

    const stopStatusMonitoring = () => {
        if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
            statusIntervalRef.current = null;
        }
    };

    // Add debug logging
    const addDebugMessage = (message: string) => {
        if (debugMode) {
            const timestamp = new Date().toLocaleTimeString();

            setMessages((prev) => [...prev, `[${timestamp}] DEBUG: ${message}`]);
        }
    };

    const getPhaseIcon = (state: string) => {
        switch (state) {
            case 'mqtt-connecting':
                return '🔗';
            case 'mqtt-connected':
                return '📡';
            case 'pairing':
                return '🤝';
            case 'key-exchange':
                return '🔐';
            case 'webrtc-negotiating':
                return '⚡';
            case 'webrtc-connected':
                return '✅';
            default:
                return '❌';
        }
    };

    const getStatusText = () => {
        if (connectionPhase) {
            return `${getPhaseIcon(connectionPhase.state)} ${connectionPhase.description}`;
        }

        switch (connectionStatus) {
            case 'webrtc-connected':
                return '✅ WebRTC Connected (P2P)';
            case 'mqtt-only':
                return '📡 MQTT Connected (Relay)';
            default:
                return '❌ Disconnected';
        }
    };

    const getStatusColor = () => {
        if (connectionPhase) {
            switch (connectionPhase.state) {
                case 'webrtc-connected':
                    return 'text-green-600';
                case 'pairing':
                case 'key-exchange':
                case 'webrtc-negotiating':
                    return 'text-blue-600';
                case 'mqtt-connected':
                    return 'text-yellow-600';
                default:
                    return 'text-red-600';
            }
        }

        switch (connectionStatus) {
            case 'webrtc-connected':
                return 'text-green-600';
            case 'mqtt-only':
                return 'text-yellow-600';
            default:
                return 'text-red-600';
        }
    };

    const getQualityColor = () => {
        switch (connectionQuality) {
            case 'excellent':
                return 'bg-green-500';
            case 'good':
                return 'bg-yellow-500';
            case 'poor':
                return 'bg-red-500';
        }
    };

    const getQualityText = () => {
        switch (connectionQuality) {
            case 'excellent':
                return 'Direct P2P (WebRTC)';
            case 'good':
                return 'Relay (MQTT)';
            case 'poor':
                return 'Poor Connection';
        }
    };

    // Unified message handler to avoid duplication
    const createMessageHandler = () => {
        return (request: any) => {
            const timestamp = new Date().toLocaleTimeString();

            // Handle different JSON-RPC methods
            if (request.method === 'lv_rawText') {
                // Extract the text message from params
                const textMessage = request.params?.[0] || 'Empty message';

                setMessages((prev) => [...prev, `[${timestamp}] Received: ${textMessage}`]);

                // Return a simple acknowledgment for text messages
                return { status: 'received' };
            } else if (request.method === 'eth_requestAccounts') {
                // Handle wallet account request with real addresses
                setMessages((prev) => [
                    ...prev,
                    `[${timestamp}] 🔐 Received wallet request: ${request.method}`,
                ]);

                const walletAddresses = getAddresses();

                if (walletAddresses.length === 0) {
                    setMessages((prev) => [
                        ...prev,
                        `[${timestamp}] ❌ No wallet accounts available`,
                    ]);

                    return { status: 'error', error: 'No accounts available' };
                }

                setMessages((prev) => [
                    ...prev,
                    `[${timestamp}] ✅ Sending eth_accounts response: ${walletAddresses[0].substring(0, 10)}...`,
                ]);

                // Send proper JSON-RPC response to the original request
                setTimeout(() => {
                    if (connectionRef.current) {
                        connectionRef.current.sendMessage({
                            jsonrpc: '2.0',
                            // eslint-disable-next-line no-restricted-syntax
                            id: request.id, // Use the original request ID
                            result: walletAddresses,
                        });
                    }
                }, 100); // Small delay to ensure proper message ordering

                // Return acknowledgment for the original request
                return { status: 'processing' };
            } else {
                // Handle other JSON-RPC methods
                setMessages((prev) => [
                    ...prev,
                    `[${timestamp}] Received JSON-RPC: ${JSON.stringify(request)}`,
                ]);

                // Return a simple acknowledgment for other methods
                return { status: 'received' };
            }
        };
    };

    // Peer A: Initialize session
    const initSession = async () => {
        if (!isInitialized) {
            await initializeWallet();
        }

        setIsConnecting(true);

        try {
            const connection = new OpenLVConnection();

            connectionRef.current = connection;

            // Add phase change handler
            connection.onPhaseChange((phase) => {
                setConnectionPhase(phase);
                const timestamp = new Date().toLocaleTimeString();

                setMessages((prev) => [
                    ...prev,
                    `[${timestamp}] ${getPhaseIcon(phase.state)} ${phase.description}`,
                ]);
            });

            // Add unified message handler
            connection.onMessage(createMessageHandler());

            const { openLVUrl } = await connection.initSession();

            setOpenLVUrl(openLVUrl);

            // Start monitoring connection status
            startStatusMonitoring();

            addDebugMessage(`Session initialized with ${accounts.length} wallet accounts`);
        } catch (error) {
            console.error('Failed to initialize session:', error);
            setMessages((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Error: Failed to initialize session`,
            ]);
            setIsConnecting(false);
        }
    };

    // Peer B: Connect to session
    const connectToSession = async () => {
        if (!connectedAsUrl.trim()) return;

        if (!isInitialized) {
            await initializeWallet();
        }

        setIsConnecting(true);

        try {
            const connection = new OpenLVConnection();

            connectionRef.current = connection;

            // Add phase change handler
            connection.onPhaseChange((phase) => {
                setConnectionPhase(phase);
                const timestamp = new Date().toLocaleTimeString();

                setMessages((prev) => [
                    ...prev,
                    `[${timestamp}] ${getPhaseIcon(phase.state)} ${phase.description}`,
                ]);
            });

            // Add unified message handler
            connection.onMessage(createMessageHandler());

            // Connect to session with just the URL
            await connection.connectToSession(connectedAsUrl.trim());

            // Start monitoring connection status
            startStatusMonitoring();

            const browserInfo = navigator.userAgent.includes('Firefox')
                ? 'Firefox'
                : 'Chrome/Other';

            addDebugMessage(
                `Connecting from ${browserInfo} browser with ${accounts.length} wallet accounts`
            );
        } catch (error) {
            console.error('Failed to connect to session:', error);
            setMessages((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Error: Failed to connect to session`,
            ]);
            setIsConnecting(false);
        }
    };

    // Send message
    const sendMessage = () => {
        if (!inputMessage.trim() || !connectionRef.current) return;

        const timestamp = new Date().toLocaleTimeString();
        const currentStatus = connectionRef.current.getConnectionStatus();
        const transport = currentStatus === 'webrtc-connected' ? 'WebRTC' : 'MQTT';

        connectionRef.current.sendMessage(inputMessage.trim());
        setMessages((prev) => [
            ...prev,
            `[${timestamp}] Sent via ${transport}: ${inputMessage.trim()}`,
        ]);
        setInputMessage('');
    };

    // Send test message to verify connection
    const sendTestMessage = () => {
        if (!connectionRef.current) return;

        const testMessage = `Test message from ${connectionStatus === 'webrtc-connected' ? 'WebRTC' : 'MQTT'} - ${new Date().toISOString()}`;

        connectionRef.current.sendMessage(testMessage);

        const timestamp = new Date().toLocaleTimeString();
        const transport =
            connectionRef.current.getConnectionStatus() === 'webrtc-connected' ? 'WebRTC' : 'MQTT';

        setMessages((prev) => [
            ...prev,
            `[${timestamp}] Test sent via ${transport}: ${testMessage}`,
        ]);
    };

    // Force WebRTC retry
    const forceRetryWebRTC = async () => {
        if (!connectionRef.current) return;

        addDebugMessage('Forcing WebRTC retry...');
        // Disconnect and reconnect to force retry
        connectionRef.current.disconnect();

        setTimeout(async () => {
            try {
                if (connectedAsUrl) {
                    await connectToSession();
                } else {
                    await initSession();
                }
            } catch (error) {
                console.error('Retry failed:', error);
                setMessages((prev) => [
                    ...prev,
                    `[${new Date().toLocaleTimeString()}] Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ]);
            }
        }, 1000);
    };

    // Add new wallet account
    const handleAddAccount = async () => {
        const newAccount = await addAccount();
        const timestamp = new Date().toLocaleTimeString();

        setMessages((prev) => [
            ...prev,
            `[${timestamp}] 💼 New account created: ${newAccount.address.substring(0, 10)}...`,
        ]);
    };

    // Disconnect
    const disconnect = () => {
        stopStatusMonitoring();

        if (connectionRef.current) {
            connectionRef.current.disconnect();
            connectionRef.current = null;
        }

        setConnectionStatus('disconnected');
        setConnectionPhase(null);
        setConnectionQuality('excellent');
        setIsConnecting(false);
        setOpenLVUrl('');
        setConnectedAsUrl('');
        setMessages([]);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">OpenLV Wallet Demo</h1>
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className={`px-3 py-1 rounded text-sm ${
                            debugMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Debug Mode
                    </button>
                </div>

                {/* Wallet Status */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold">Wallet Status:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                                {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={handleAddAccount}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                            >
                                + Add Account
                            </button>
                        </div>
                    </div>

                    {accounts.length > 0 && (
                        <div className="text-sm space-y-1">
                            {accounts.map((account, index) => (
                                <div key={index} className="bg-gray-50 p-2 rounded">
                                    <div className="font-mono text-xs">
                                        <span className="text-gray-600">Account {index + 1}:</span>{' '}
                                        {account.address}
                                    </div>
                                    {debugMode && (
                                        <div className="font-mono text-xs text-gray-500 mt-1">
                                            Private Key: {account.privateKey.substring(0, 20)}...
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⚠️ Note: In this demo, keys are stored in memory only. In production, use
                        secure storage with proper encryption.
                    </div>
                </div>

                {/* Connection Status */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold">Connection Status:</span>
                        <div className="flex items-center gap-2">
                            {isConnecting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            )}
                            <span
                                className={`text-sm font-semibold ${getStatusColor()}`}
                                data-testid="connection-status"
                            >
                                {getStatusText()}
                            </span>
                        </div>
                    </div>

                    {connectionStatus !== 'disconnected' && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Connection Quality:</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-3 h-3 rounded-full ${getQualityColor()}`}
                                    ></div>
                                    <span className="text-sm font-medium">{getQualityText()}</span>
                                </div>
                            </div>

                            {connectionPhase && (
                                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                                    <div className="flex items-center justify-between">
                                        <span>Phase: {connectionPhase.state}</span>
                                        <span>
                                            {new Date(
                                                connectionPhase.timestamp
                                            ).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Peer A - Session Initiator */}
                    <div className="bg-white rounded-lg p-6 shadow">
                        <h2 className="text-xl font-semibold mb-4">Peer A - Create Session</h2>

                        <button
                            onClick={initSession}
                            disabled={connectionStatus !== 'disconnected'}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-4 hover:bg-blue-600 disabled:bg-gray-400"
                            data-testid="init-session-button"
                        >
                            Initialize Session
                        </button>

                        {openLVUrl && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded">
                                    <label className="block text-sm font-medium mb-2">
                                        Connection URL:
                                    </label>
                                    <div
                                        className="text-xs break-all bg-white p-2 rounded border"
                                        data-testid="connection-url"
                                    >
                                        {openLVUrl}
                                    </div>
                                </div>

                                <div className="flex justify-center bg-white p-4 rounded border">
                                    <QRCodeSVG value={openLVUrl} size={200} />
                                </div>

                                <div className="text-xs text-center text-gray-600">
                                    Share this QR code or URL with Peer B
                                </div>

                                {debugMode && (
                                    <div className="bg-yellow-50 p-2 rounded text-xs">
                                        <strong>Debug:</strong> Open browser console to see detailed
                                        WebRTC logs
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Peer B - Session Joiner */}
                    <div className="bg-white rounded-lg p-6 shadow">
                        <h2 className="text-xl font-semibold mb-4">Peer B - Join Session</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Paste Connection URL:
                                </label>
                                <input
                                    type="text"
                                    value={connectedAsUrl}
                                    onChange={(e) => setConnectedAsUrl(e.target.value)}
                                    placeholder="openlv://..."
                                    className="w-full p-2 border rounded"
                                    disabled={connectionStatus !== 'disconnected'}
                                    data-testid="connection-url-input"
                                />
                            </div>

                            <button
                                onClick={connectToSession}
                                disabled={
                                    !connectedAsUrl.trim() || connectionStatus !== 'disconnected'
                                }
                                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
                                data-testid="connect-session-button"
                            >
                                Connect to Session
                            </button>

                            <div className="text-xs text-gray-600">
                                After connecting, the pairing process will begin automatically
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messaging Interface */}
                {connectionStatus !== 'disconnected' && (
                    <div className="bg-white rounded-lg p-6 shadow mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Messages</h2>
                            <div className="flex gap-2">
                                {connectionStatus === 'mqtt-only' && !isConnecting && (
                                    <button
                                        onClick={forceRetryWebRTC}
                                        className="bg-orange-500 text-white py-1 px-3 rounded text-sm hover:bg-orange-600"
                                    >
                                        Retry WebRTC
                                    </button>
                                )}
                                <button
                                    onClick={sendTestMessage}
                                    className="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600"
                                    data-testid="send-test-button"
                                >
                                    Send Test
                                </button>
                                <button
                                    onClick={disconnect}
                                    className="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>

                        {/* Message Display */}
                        <div
                            className="bg-gray-50 p-4 rounded mb-4 h-48 overflow-y-auto"
                            data-testid="message-log"
                        >
                            {messages.length === 0 ? (
                                <p className="text-gray-500 text-center">No messages yet...</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className="mb-2 text-sm">
                                        <span
                                            className={`font-mono ${
                                                message.includes('DEBUG:')
                                                    ? 'text-blue-600'
                                                    : message.includes('🤝') ||
                                                        message.includes('🔐') ||
                                                        message.includes('⚡')
                                                      ? 'text-purple-600 font-semibold'
                                                      : message.includes('✅')
                                                        ? 'text-green-600 font-semibold'
                                                        : message.includes('💼')
                                                          ? 'text-orange-600 font-semibold'
                                                          : ''
                                            }`}
                                        >
                                            {message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 p-2 border rounded"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim()}
                                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                Send
                            </button>
                        </div>

                        <div className="mt-2 text-xs text-gray-600">
                            Messages are sent via{' '}
                            {connectionStatus === 'webrtc-connected'
                                ? 'WebRTC (direct P2P)'
                                : 'MQTT (relay)'}
                        </div>

                        {connectionPhase && connectionPhase.state === 'webrtc-connected' && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                                ✅ Direct P2P connection established! MQTT connection has been
                                closed to save resources. Messages are now sent directly between
                                peers via WebRTC DataChannel.
                            </div>
                        )}

                        {connectionPhase &&
                            ['pairing', 'key-exchange', 'webrtc-negotiating'].includes(
                                connectionPhase.state
                            ) && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                                    🔄 Connection in progress: {connectionPhase.description}
                                    {navigator.userAgent.includes('Firefox')
                                        ? ' Firefox may take longer due to TURN server requirements.'
                                        : ' This usually completes within 5-10 seconds.'}
                                </div>
                            )}

                        {debugMode && connectionPhase && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-600">
                                🔧 Debug: Current state = {connectionPhase.state}, Browser ={' '}
                                {navigator.userAgent.includes('Firefox')
                                    ? 'Firefox'
                                    : 'Chrome/Other'}
                                , Wallet accounts = {accounts.length}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export { App };
