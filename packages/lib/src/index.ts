import mqtt from 'mqtt';

import { EIP1474Method } from './provider.js';

export type SessionConfig = {
    mqttUrl?: string;
};

export type ConnectionPayload = {
    sessionId: string;
    sharedKey: string;
};

export type MessageHandler = (message: string) => void;

export type WebRTCMessage = {
    type: 'hello' | 'webrtc-offer' | 'webrtc-answer' | 'ice-candidate' | 'data';
    payload: any;
    sessionId: string;
    sharedKey: string;
};

export const contentTopic = ({ sessionId }: { sessionId: string }) =>
    `/openlv/session/${sessionId}`;

// include 'wss://test.mosquitto.org:8081/mqtt' later
// openlv://{sessionId}?sharedKey={sharedKey}
// openlv://abcdefg?sharedKey=1234567890
export const decodeConnectionURL = (url: string): ConnectionPayload => {
    // openlv://abcdefg?sharedKey=1234567890
    // regex to get sessionId and sharedKey
    const [, sessionId, sharedKey] = url.match(/openlv:\/\/([^?]+)\?sharedKey=([^&]+)/) ?? [];

    return {
        sessionId,
        sharedKey,
    };
};

export const encodeConnectionURL = (payload: ConnectionPayload) => {
    return `openlv://${payload.sessionId}?sharedKey=${payload.sharedKey}`;
};

export class OpenLVConnection {
    client: mqtt.MqttClient;
    private sessionId?: string;
    private sharedKey?: string;
    private cryptoKey?: CryptoKey;
    private peerConnection?: RTCPeerConnection;
    private dataChannel?: RTCDataChannel;
    private messageHandlers: MessageHandler[] = [];
    private isInitiator = false;
    private isConnected = false;
    private messageHandlerSetup = false;
    private pendingICECandidates: RTCIceCandidateInit[] = [];
    private webrtcRetryCount = 0;
    private maxWebrtcRetries = 5;
    private webrtcRetryInterval?: NodeJS.Timeout;
    private connectionTimeout?: NodeJS.Timeout;

    constructor(config?: SessionConfig) {
        this.client = mqtt.connect(config?.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt');
        this.setupMQTTHandlers();
    }

    private setupMQTTHandlers() {
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            console.error('MQTT connection error:', error);
            this.isConnected = false;
        });

        this.client.on('disconnect', () => {
            console.log('Disconnected from MQTT broker');
            this.isConnected = false;
        });
    }

    private setupMessageHandler() {
        if (this.messageHandlerSetup || !this.sessionId) return;

        const topic = contentTopic({ sessionId: this.sessionId });

        this.client.on('message', (receivedTopic, message) => {
            if (receivedTopic === topic) {
                console.log('Received MQTT message on topic', receivedTopic, message.toString());
                this.handleMQTTMessage(message.toString());
            }
        });

        this.messageHandlerSetup = true;
    }

    private isFirefox(): boolean {
        return typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');
    }

    private async setupPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        console.log(
            'Setting up WebRTC PeerConnection for',
            this.isFirefox() ? 'Firefox' : 'Other browser'
        );

        // Enhanced ICE servers configuration for better Firefox compatibility
        const iceServers = [
            // Google STUN servers (multiple for redundancy)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },

            // Additional reliable STUN servers
            { urls: 'stun:stun.services.mozilla.com:3478' },
            { urls: 'stun:stun.nextcloud.com:443' },
            { urls: 'stun:stun.ekiga.net:3478' },
            { urls: 'stun:stun.stunprotocol.org:3478' },

            // OpenRelay Project TURN servers (free, reliable)
            {
                urls: [
                    'turn:openrelay.metered.ca:80',
                    'turn:openrelay.metered.ca:80?transport=tcp',
                    'turn:openrelay.metered.ca:443',
                    'turn:openrelay.metered.ca:443?transport=tcp',
                ],
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },

            // Additional public TURN servers as fallbacks
            {
                urls: ['turn:freestun.net:3478', 'turn:freestun.net:3478?transport=tcp'],
                username: 'free',
                credential: 'free',
            },
        ];

        // Firefox-specific configuration
        const rtcConfig: RTCConfiguration = {
            iceServers,
            iceCandidatePoolSize: this.isFirefox() ? 15 : 10, // More candidates for Firefox
            iceTransportPolicy: 'all', // Allow both STUN and TURN
            bundlePolicy: 'max-bundle', // Bundle all media on one transport
            rtcpMuxPolicy: 'require', // Required for modern WebRTC
        };

        this.peerConnection = new RTCPeerConnection(rtcConfig);

        console.log('WebRTC PeerConnection created with', iceServers.length, 'ICE servers');
        console.log('STUN servers:', iceServers.filter((s) => !('username' in s)).length);
        console.log('TURN servers:', iceServers.filter((s) => 'username' in s).length);

        // Add connection state change handler
        this.peerConnection.onconnectionstatechange = () => {
            console.log('WebRTC connection state:', this.peerConnection?.connectionState);

            if (this.peerConnection?.connectionState === 'connected') {
                this.clearWebRTCRetry();
                this.clearConnectionTimeout();
            } else if (this.peerConnection?.connectionState === 'failed') {
                console.warn('WebRTC connection failed, attempting retry...');
                this.retryWebRTCConnection();
            }
        };

        // Set up data channel for peer-to-peer messaging
        if (this.isInitiator) {
            this.dataChannel = this.peerConnection.createDataChannel('openlv-data');
            this.setupDataChannelHandlers(this.dataChannel);
        } else {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannelHandlers(this.dataChannel);
            };
        }

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(
                    'Sending ICE candidate:',
                    event.candidate.type,
                    event.candidate.protocol
                );
                this.sendMQTTMessage({
                    type: 'ice-candidate',
                    payload: event.candidate,
                    sessionId: this.sessionId!,
                    sharedKey: this.sharedKey!,
                });
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection?.iceConnectionState);

            if (
                this.peerConnection?.iceConnectionState === 'connected' ||
                this.peerConnection?.iceConnectionState === 'completed'
            ) {
                console.log('ICE connection established successfully');
            } else if (this.peerConnection?.iceConnectionState === 'failed') {
                console.warn('ICE connection failed, retrying...');
                this.retryWebRTCConnection();
            }
        };

        // Handle ICE gathering state changes
        this.peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
        };
    }

    private setupDataChannelHandlers(dataChannel: RTCDataChannel) {
        dataChannel.onopen = () => {
            console.log('WebRTC data channel opened');
            this.clearWebRTCRetry();
            this.clearConnectionTimeout();
        };

        dataChannel.onmessage = (event) => {
            console.log('Received WebRTC message:', event.data);
            this.messageHandlers.forEach((handler) => handler(event.data));
        };

        dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };

        dataChannel.onclose = () => {
            console.log('WebRTC data channel closed');
        };
    }

    private waitForMQTTConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();

                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('MQTT connection timeout'));
            }, 10000);

            const checkConnection = () => {
                if (this.isConnected) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    private async deriveEncryptionKey(sharedKey: string): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(sharedKey),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('openlv-salt'),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    private async encryptMessage(message: string): Promise<string> {
        if (!this.cryptoKey) {
            throw new Error('Encryption key not available');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.cryptoKey,
            data
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);

        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Return as base64
        return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    }

    private async decryptMessage(encryptedMessage: string): Promise<string> {
        if (!this.cryptoKey) {
            throw new Error('Encryption key not available');
        }

        try {
            // Decode from base64
            const combined = new Uint8Array(
                atob(encryptedMessage)
                    .split('')
                    .map((char) => char.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.cryptoKey,
                encrypted
            );

            const decoder = new TextDecoder();

            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            throw new Error('Message decryption failed');
        }
    }

    private async sendMQTTMessage(message: WebRTCMessage) {
        if (!this.sessionId || !this.cryptoKey) return;

        try {
            await this.waitForMQTTConnection();

            const topic = contentTopic({ sessionId: this.sessionId });

            // Encrypt the entire message payload
            const encryptedPayload = await this.encryptMessage(JSON.stringify(message));

            console.log('Sending encrypted MQTT message:', message.type, 'to topic:', topic);

            this.client.publish(topic, encryptedPayload, (error) => {
                if (error) {
                    console.error('Error publishing MQTT message:', error);
                } else {
                    console.log('Encrypted MQTT message sent successfully:', message.type);
                }
            });
        } catch (error) {
            console.error('Failed to send encrypted MQTT message:', error);
        }
    }

    private async handleMQTTMessage(encryptedMessageStr: string) {
        try {
            // Decrypt the message payload
            const decryptedMessageStr = await this.decryptMessage(encryptedMessageStr);
            const message: WebRTCMessage = JSON.parse(decryptedMessageStr);

            console.log('Processing decrypted MQTT message:', message.type);

            // Verify shared key (additional security layer)
            if (message.sharedKey !== this.sharedKey) {
                console.warn('Invalid shared key in decrypted message, ignoring');

                return;
            }

            switch (message.type) {
                case 'hello':
                    if (this.isInitiator) {
                        console.log('Received hello from Peer B, starting WebRTC offer');
                        await this.createWebRTCOffer();
                    }

                    break;

                case 'webrtc-offer':
                    if (!this.isInitiator) {
                        console.log('Received WebRTC offer from Peer B');
                        await this.handleWebRTCOffer(message.payload);
                    }

                    break;

                case 'webrtc-answer':
                    if (this.isInitiator) {
                        console.log('Received WebRTC answer from Peer B');
                        await this.handleWebRTCAnswer(message.payload);
                    }

                    break;

                case 'ice-candidate':
                    console.log('Received ICE candidate');
                    await this.handleICECandidate(message.payload);
                    break;

                case 'data':
                    this.messageHandlers.forEach((handler) => handler(message.payload));
                    break;
            }
        } catch (error) {
            console.error('Error handling encrypted MQTT message:', error);
        }
    }

    private async createWebRTCOffer() {
        if (!this.peerConnection) return;

        try {
            console.log('Creating WebRTC offer...');
            const offer = await this.peerConnection.createOffer();

            await this.peerConnection.setLocalDescription(offer);

            console.log('Sending WebRTC offer');
            await this.sendMQTTMessage({
                type: 'webrtc-offer',
                payload: offer,
                sessionId: this.sessionId!,
                sharedKey: this.sharedKey!,
            });

            // Set connection timeout
            this.setConnectionTimeout();
        } catch (error) {
            console.error('Error creating WebRTC offer:', error);
            this.retryWebRTCConnection();
        }
    }

    private async handleWebRTCOffer(offer: RTCSessionDescriptionInit) {
        if (!this.peerConnection) return;

        try {
            console.log('Handling WebRTC offer...');
            await this.peerConnection.setRemoteDescription(offer);

            // Process any pending ICE candidates
            for (const candidate of this.pendingICECandidates) {
                await this.peerConnection.addIceCandidate(candidate);
            }
            this.pendingICECandidates = [];

            const answer = await this.peerConnection.createAnswer();

            await this.peerConnection.setLocalDescription(answer);

            console.log('Sending WebRTC answer');
            await this.sendMQTTMessage({
                type: 'webrtc-answer',
                payload: answer,
                sessionId: this.sessionId!,
                sharedKey: this.sharedKey!,
            });

            // Set connection timeout
            this.setConnectionTimeout();
        } catch (error) {
            console.error('Error handling WebRTC offer:', error);
            this.retryWebRTCConnection();
        }
    }

    private async handleWebRTCAnswer(answer: RTCSessionDescriptionInit) {
        if (!this.peerConnection) return;

        try {
            console.log('Handling WebRTC answer...');
            await this.peerConnection.setRemoteDescription(answer);

            // Process any pending ICE candidates
            for (const candidate of this.pendingICECandidates) {
                await this.peerConnection.addIceCandidate(candidate);
            }
            this.pendingICECandidates = [];
        } catch (error) {
            console.error('Error handling WebRTC answer:', error);
            this.retryWebRTCConnection();
        }
    }

    private async handleICECandidate(candidate: RTCIceCandidateInit) {
        if (!this.peerConnection) return;

        try {
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate);
                console.log('Added ICE candidate');
            } else {
                // Queue ICE candidate for later processing
                this.pendingICECandidates.push(candidate);
                console.log('Queued ICE candidate (no remote description yet)');
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    private retryWebRTCConnection() {
        if (this.webrtcRetryCount >= this.maxWebrtcRetries) {
            console.error('Max WebRTC retry attempts reached');

            return;
        }

        this.webrtcRetryCount++;
        console.log(
            `Retrying WebRTC connection (attempt ${this.webrtcRetryCount}/${this.maxWebrtcRetries})`
        );

        this.webrtcRetryInterval = setTimeout(async () => {
            await this.setupPeerConnection();

            if (this.isInitiator) {
                await this.createWebRTCOffer();
            }
        }, 2000 * this.webrtcRetryCount); // Exponential backoff
    }

    private clearWebRTCRetry() {
        if (this.webrtcRetryInterval) {
            clearTimeout(this.webrtcRetryInterval);
            this.webrtcRetryInterval = undefined;
        }

        this.webrtcRetryCount = 0;
    }

    private setConnectionTimeout() {
        this.clearConnectionTimeout();
        this.connectionTimeout = setTimeout(() => {
            console.warn('WebRTC connection timeout, retrying...');
            this.retryWebRTCConnection();
        }, 15000); // 15 second timeout
    }

    private clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = undefined;
        }
    }

    _generateSessionId(): string {
        return crypto.randomUUID();
    }

    _generateSharedKey(): string {
        return crypto.randomUUID();
    }

    // Peer A: Initialize session and generate openLVUrl
    async initSession(): Promise<{ openLVUrl: string }> {
        this.isInitiator = true;
        this.sessionId = this._generateSessionId();
        this.sharedKey = this._generateSharedKey();

        // Derive encryption key from shared key
        this.cryptoKey = await this.deriveEncryptionKey(this.sharedKey);

        const topic = contentTopic({ sessionId: this.sessionId });

        console.log('Initializing session with topic:', topic);

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error('Error subscribing to topic:', error);
            } else {
                console.log('Successfully subscribed to topic:', topic);
            }
        });

        this.setupMessageHandler();
        await this.setupPeerConnection();

        const openLVUrl = encodeConnectionURL({
            sessionId: this.sessionId,
            sharedKey: this.sharedKey,
        });

        return {
            openLVUrl,
        };
    }

    // Peer B: Connect to session using openLVUrl
    async connectToSession(config: { openLVUrl: string; onMessage?: (message: string) => void }) {
        this.isInitiator = false;
        const { sessionId, sharedKey } = decodeConnectionURL(config.openLVUrl);

        this.sessionId = sessionId;
        this.sharedKey = sharedKey;

        // Derive encryption key from shared key
        this.cryptoKey = await this.deriveEncryptionKey(this.sharedKey);

        console.log('Connecting to session:', sessionId);

        if (config.onMessage) {
            this.messageHandlers.push(config.onMessage);
        }

        const topic = contentTopic({ sessionId });

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error('Error subscribing to topic:', error);
            } else {
                console.log('Successfully subscribed to topic:', topic);

                // Send hello message after successful subscription
                setTimeout(() => {
                    this.sendMQTTMessage({
                        type: 'hello',
                        payload: 'Hello from Peer B',
                        sessionId,
                        sharedKey,
                    });
                }, 1000); // Give MQTT time to fully connect
            }
        });

        this.setupMessageHandler();
        await this.setupPeerConnection();
    }

    // Add message handler for peer-to-peer communication
    onMessage(handler: MessageHandler) {
        this.messageHandlers.push(handler);
    }

    // Send message via WebRTC data channel (preferred) or MQTT fallback
    sendMessage(message: EIP1474Method) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            // Send via WebRTC data channel
            this.dataChannel.send(message);
        } else if (this.sessionId && this.sharedKey) {
            // Fallback to MQTT
            this.sendMQTTMessage({
                type: 'data',
                payload: message,
                sessionId: this.sessionId,
                sharedKey: this.sharedKey,
            });
        } else {
            console.error('No connection available to send message');
        }
    }

    // Get connection status
    getConnectionStatus(): 'disconnected' | 'mqtt-only' | 'webrtc-connected' {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            return 'webrtc-connected';
        } else if (this.client.connected) {
            return 'mqtt-only';
        } else {
            return 'disconnected';
        }
    }

    // Cleanup
    disconnect() {
        this.clearWebRTCRetry();
        this.clearConnectionTimeout();

        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        if (this.client) {
            this.client.end();
        }

        // Reset state
        this.messageHandlerSetup = false;
        this.webrtcRetryCount = 0;
        this.pendingICECandidates = [];
    }
}

// legacy start connection code but demonstrates mqtt, remove this later
// export const startConnection = (config: SessionConfig) => {
//     const client = mqtt.connect(config.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt');

//     client.on('message', (topic, message) => {
//         console.log('Received message on topic', topic, message.toString());
//     });

//     return {
//         client,
//         // topic is the content topic
//         subscribe: (topic: string) => {
//             client.subscribe(topic, (err, granted, packet) => {
//                 if (err) {
//                     console.error('Error subscribing to topic', err);
//                 }

//                 console.log('Subscribed to topic', topic, granted, packet);
//             });
//         },
//         // topic is the content topic
//         publish: (topic: string, message: string) => {
//             client.publish(topic, message, (err) => {
//                 if (err) {
//                     console.error('Error publishing message', err);
//                 }
//             });
//         },
//     };
// };
