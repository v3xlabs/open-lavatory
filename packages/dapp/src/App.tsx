import { OpenLVConnection } from 'lib';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

// let connection;
// Choose a content topic
// const contentTopic = '/light-guide/1/message/proto';
// const encoder = createEncoder({ contentTopic, ephemeral: true });
// const decoder = createDecoder(contentTopic);

// const contentTopic = '/light-guide/1/message/proto'

const App = () => {
    const [openLVUrl, setOpenLVUrl] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<
        'disconnected' | 'mqtt-only' | 'webrtc-connected'
    >('disconnected');
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
                    // Keep connecting state if we're still trying to establish WebRTC
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

    // Peer A: Initialize session
    const initSession = async () => {
        setIsConnecting(true);
        const connection = new OpenLVConnection();

        connectionRef.current = connection;

        const { openLVUrl } = connection.initSession();

        setOpenLVUrl(openLVUrl);

        // Add message handler
        connection.onMessage((message) => {
            const timestamp = new Date().toLocaleTimeString();

            setMessages((prev) => [...prev, `[${timestamp}] Received: ${message}`]);
        });

        // Start monitoring connection status
        startStatusMonitoring();

        // Add a status message
        setMessages((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Session initialized, waiting for peer to connect...`,
        ]);
    };

    // Peer B: Connect to session
    const connectToSession = () => {
        if (!connectedAsUrl.trim()) return;

        setIsConnecting(true);
        const connection = new OpenLVConnection();

        connectionRef.current = connection;

        connection.connectToSession({
            openLVUrl: connectedAsUrl.trim(),
            onMessage: (message) => {
                const timestamp = new Date().toLocaleTimeString();

                setMessages((prev) => [...prev, `[${timestamp}] Received: ${message}`]);
            },
        });

        // Start monitoring connection status
        startStatusMonitoring();

        setMessages((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Connecting to session, establishing WebRTC connection...`,
        ]);
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
    const forceRetryWebRTC = () => {
        if (!connectionRef.current) return;

        addDebugMessage('Forcing WebRTC retry...');
        // Disconnect and reconnect to force retry
        connectionRef.current.disconnect();

        setTimeout(() => {
            if (connectedAsUrl) {
                connectToSession();
            } else {
                initSession();
            }
        }, 1000);
    };

    // Disconnect
    const disconnect = () => {
        stopStatusMonitoring();

        if (connectionRef.current) {
            connectionRef.current.disconnect();
            connectionRef.current = null;
        }

        setConnectionStatus('disconnected');
        setConnectionQuality('excellent');
        setIsConnecting(false);
        setOpenLVUrl('');
        setConnectedAsUrl('');
        setMessages([]);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'webrtc-connected':
                return 'text-green-600';
            case 'mqtt-only':
                return 'text-yellow-600';
            default:
                return 'text-red-600';
        }
    };

    const getStatusText = () => {
        if (isConnecting && connectionStatus === 'mqtt-only') {
            return 'Establishing WebRTC...';
        }

        switch (connectionStatus) {
            case 'webrtc-connected':
                return 'WebRTC Connected';
            case 'mqtt-only':
                return 'MQTT Only';
            default:
                return 'Disconnected';
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

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">OpenLV Demo</h1>
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className={`px-3 py-1 rounded text-sm ${
                            debugMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Debug Mode
                    </button>
                </div>

                {/* Connection Status */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold">Status:</span>
                        <div className="flex items-center gap-2">
                            {isConnecting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            )}
                            <span className={`text-lg font-semibold ${getStatusColor()}`}>
                                {getStatusText()}
                            </span>
                        </div>
                    </div>

                    {connectionStatus !== 'disconnected' && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Connection Quality:</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getQualityColor()}`}></div>
                                <span className="text-sm font-medium">{getQualityText()}</span>
                            </div>
                        </div>
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
                        >
                            Initialize Session
                        </button>

                        {openLVUrl && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded">
                                    <label className="block text-sm font-medium mb-2">
                                        Connection URL:
                                    </label>
                                    <div className="text-xs break-all bg-white p-2 rounded border">
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
                                />
                            </div>

                            <button
                                onClick={connectToSession}
                                disabled={
                                    !connectedAsUrl.trim() || connectionStatus !== 'disconnected'
                                }
                                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
                            >
                                Connect to Session
                            </button>

                            <div className="text-xs text-gray-600">
                                After connecting, WebRTC negotiation will begin automatically
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
                                {connectionStatus === 'mqtt-only' && (
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
                        <div className="bg-gray-50 p-4 rounded mb-4 h-48 overflow-y-auto">
                            {messages.length === 0 ? (
                                <p className="text-gray-500 text-center">No messages yet...</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className="mb-2 text-sm">
                                        <span
                                            className={`font-mono ${
                                                message.includes('DEBUG:') ? 'text-blue-600' : ''
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

                        {connectionStatus === 'mqtt-only' && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                                ⚠️ WebRTC connection in progress. Check browser console for details.
                                If stuck, try the "Retry WebRTC" button.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export { App };
