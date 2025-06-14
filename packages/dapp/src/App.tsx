import { OpenLVConnection } from 'lib';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef } from 'react';

// let connection;
// Choose a content topic
// const contentTopic = '/light-guide/1/message/proto';
// const encoder = createEncoder({ contentTopic, ephemeral: true });
// const decoder = createDecoder(contentTopic);

// const contentTopic = '/light-guide/1/message/proto'

const App = () => {
    const [openLVUrl, setOpenLVUrl] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'mqtt-only' | 'webrtc-connected'>('disconnected');
    const [messages, setMessages] = useState<string[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [connectedAsUrl, setConnectedAsUrl] = useState<string>('');
    const connectionRef = useRef<OpenLVConnection | null>(null);

    // Peer A: Initialize session
    const initSession = async () => {
        const connection = new OpenLVConnection();
        connectionRef.current = connection;
        
        const { openLVUrl } = connection.initSession();
        setOpenLVUrl(openLVUrl);

        // Add message handler
        connection.onMessage((message) => {
            setMessages(prev => [...prev, `Received: ${message}`]);
        });

        // Monitor connection status
        const statusInterval = setInterval(() => {
            const status = connection.getConnectionStatus();
            setConnectionStatus(status);
        }, 1000);

        // Cleanup interval when component unmounts or connection changes
        return () => clearInterval(statusInterval);
    };

    // Peer B: Connect to session
    const connectToSession = () => {
        if (!connectedAsUrl.trim()) return;

        const connection = new OpenLVConnection();
        connectionRef.current = connection;

        connection.connectToSession({
            openLVUrl: connectedAsUrl.trim(),
            onMessage: (message) => {
                setMessages(prev => [...prev, `Received: ${message}`]);
            }
        });

        // Monitor connection status
        const statusInterval = setInterval(() => {
            const status = connection.getConnectionStatus();
            setConnectionStatus(status);
        }, 1000);

        setMessages(prev => [...prev, 'Connected to session, waiting for WebRTC...']);
    };

    // Send message
    const sendMessage = () => {
        if (!inputMessage.trim() || !connectionRef.current) return;

        connectionRef.current.sendMessage(inputMessage.trim());
        setMessages(prev => [...prev, `Sent: ${inputMessage.trim()}`]);
        setInputMessage('');
    };

    // Disconnect
    const disconnect = () => {
        if (connectionRef.current) {
            connectionRef.current.disconnect();
            connectionRef.current = null;
        }
        setConnectionStatus('disconnected');
        setOpenLVUrl('');
        setConnectedAsUrl('');
        setMessages([]);
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'webrtc-connected': return 'text-green-600';
            case 'mqtt-only': return 'text-yellow-600';
            default: return 'text-red-600';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'webrtc-connected': return 'WebRTC Connected';
            case 'mqtt-only': return 'MQTT Only';
            default: return 'Disconnected';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">OpenLV Demo</h1>
                
                {/* Connection Status */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">Status:</span>
                        <span className={`text-lg font-semibold ${getStatusColor()}`}>
                            {getStatusText()}
                        </span>
                    </div>
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
                                    <label className="block text-sm font-medium mb-2">Connection URL:</label>
                                    <div className="text-xs break-all bg-white p-2 rounded border">
                                        {openLVUrl}
                                    </div>
                                </div>
                                
                                <div className="flex justify-center bg-white p-4 rounded border">
                                    <QRCodeSVG value={openLVUrl} size={200} />
                                </div>
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
                                disabled={!connectedAsUrl.trim() || connectionStatus !== 'disconnected'}
                                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
                            >
                                Connect to Session
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messaging Interface */}
                {connectionStatus !== 'disconnected' && (
                    <div className="bg-white rounded-lg p-6 shadow mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Messages</h2>
                            <button
                                onClick={disconnect}
                                className="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600"
                            >
                                Disconnect
                            </button>
                        </div>

                        {/* Message Display */}
                        <div className="bg-gray-50 p-4 rounded mb-4 h-48 overflow-y-auto">
                            {messages.length === 0 ? (
                                <p className="text-gray-500 text-center">No messages yet...</p>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} className="mb-2 text-sm">
                                        <span className="text-gray-600">
                                            [{new Date().toLocaleTimeString()}]
                                        </span>{' '}
                                        {message}
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
                    </div>
                )}
            </div>
        </div>
    );
};

export { App };
