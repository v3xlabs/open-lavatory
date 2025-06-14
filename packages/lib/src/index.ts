import mqtt from 'mqtt';

export type SessionConfig = {
    mqttUrl?: string;
    protocol?: 'mqtt' | 'waku' | 'nostr';
};

export type ConnectionPayload = {
    sessionId: string;
    pubkeyHash: string;
    server?: string;
    protocol?: 'mqtt' | 'waku' | 'nostr';
};

export type MessageHandler = (message: string) => void;

export type WebRTCMessage = {
    type: 'pubkey' | 'ping' | 'hello' | 'webrtc-offer' | 'webrtc-answer' | 'ice-candidate' | 'data';
    payload: any;
    sessionId: string;
    timestamp: number;
};

export const contentTopic = ({ sessionId }: { sessionId: string }) =>
    `/openlv/session/${sessionId}`;

// include 'wss://test.mosquitto.org:8081/mqtt' later
// Enhanced URL format: openlv://{sessionId}?h={pubkeyHash}&s={server}&p={protocol}
// Example: openlv://abcdefg?h=YWJjZGVmZ2g&s=wss%3A//test.mosquitto.org%3A8081/mqtt&p=mqtt
export const decodeConnectionURL = (url: string): ConnectionPayload => {
    try {
        const urlObj = new URL(url);
        const sessionId = urlObj.hostname || urlObj.pathname.replace('/', '');
        const pubkeyHash = urlObj.searchParams.get('h') || '';
        const server = urlObj.searchParams.get('s') || undefined;
        const protocol = (urlObj.searchParams.get('p') as 'mqtt' | 'waku' | 'nostr') || 'mqtt';

        return {
            sessionId,
            pubkeyHash,
            server: server ? decodeURIComponent(server) : undefined,
            protocol,
        };
    } catch {
        // Fallback to legacy regex parsing (supports both old and new formats)
        const legacyMatch = url.match(/openlv:\/\/([^?]+)\?(?:sharedKey|k|h)=([^&]+)/) ?? [];
        const [, sessionId, keyOrHash] = legacyMatch;

        return {
            sessionId,
            pubkeyHash: keyOrHash,
        };
    }
};

export const encodeConnectionURL = (payload: ConnectionPayload) => {
    const params = new URLSearchParams();

    params.set('h', payload.pubkeyHash);

    if (payload.server) {
        params.set('s', payload.server);
    }

    if (payload.protocol && payload.protocol !== 'mqtt') {
        params.set('p', payload.protocol);
    }

    return `openlv://${payload.sessionId}?${params.toString()}`;
};

export class OpenLVConnection {
    client: mqtt.MqttClient;
    private sessionId?: string;
    private pubkeyHash?: string;
    private privateKey?: CryptoKey;
    private publicKey?: CryptoKey;
    private peerPublicKey?: CryptoKey;
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
                this.sendMQTTMessage(
                    {
                        type: 'ice-candidate',
                        payload: event.candidate,
                        sessionId: this.sessionId!,
                        timestamp: Date.now(),
                    },
                    this.peerPublicKey
                );
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

    private async generateKeyPair(): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
        return await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256',
            },
            true,
            ['deriveKey']
        );
    }

    private async exportPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
        return await crypto.subtle.exportKey('raw', publicKey);
    }

    private async importPublicKey(keyData: ArrayBuffer): Promise<CryptoKey> {
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'ECDH',
                namedCurve: 'P-256',
            },
            false,
            []
        );
    }

    private async computePublicKeyHash(publicKey: CryptoKey): Promise<string> {
        const exportedKey = await this.exportPublicKey(publicKey);
        const hashBuffer = await crypto.subtle.digest('SHA-256', exportedKey);
        const hashArray = new Uint8Array(hashBuffer);
        const shortHash = hashArray.slice(0, 8); // First 8 bytes

        return btoa(String.fromCharCode.apply(null, Array.from(shortHash)));
    }

    private async deriveSharedKey(
        privateKey: CryptoKey,
        peerPublicKey: CryptoKey
    ): Promise<CryptoKey> {
        const sharedSecret = await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: peerPublicKey,
            },
            privateKey,
            {
                name: 'AES-GCM',
                length: 256,
            },
            false,
            ['encrypt', 'decrypt']
        );

        return sharedSecret;
    }

    private async encryptMessage(
        message: WebRTCMessage,
        recipientPublicKey: CryptoKey
    ): Promise<string> {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }

        const sharedKey = await this.deriveSharedKey(this.privateKey, recipientPublicKey);
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, data);

        // Get ephemeral public key for ECIES
        const ephemeralPublicKey = await this.exportPublicKey(this.publicKey!);

        // Combine ephemeral public key, IV and encrypted data
        const combined = new Uint8Array(
            ephemeralPublicKey.byteLength + iv.length + encrypted.byteLength
        );

        combined.set(new Uint8Array(ephemeralPublicKey));
        combined.set(iv, ephemeralPublicKey.byteLength);
        combined.set(new Uint8Array(encrypted), ephemeralPublicKey.byteLength + iv.length);

        // Return as base64
        return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    }

    private async decryptMessage(encryptedMessage: string): Promise<WebRTCMessage> {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }

        try {
            // Decode from base64
            const combined = new Uint8Array(
                atob(encryptedMessage)
                    .split('')
                    .map((char) => char.charCodeAt(0))
            );

            // Extract ephemeral public key, IV and encrypted data
            const ephemeralPublicKey = combined.slice(0, 65); // P-256 uncompressed key is 65 bytes
            const iv = combined.slice(65, 77); // 12 bytes
            const encrypted = combined.slice(77);

            // Import ephemeral public key
            const senderPublicKey = await this.importPublicKey(ephemeralPublicKey.buffer);

            // Derive shared key
            const sharedKey = await this.deriveSharedKey(this.privateKey, senderPublicKey);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                sharedKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const messageStr = decoder.decode(decrypted);

            return JSON.parse(messageStr);
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            throw new Error('Message decryption failed');
        }
    }

    private async sendMQTTMessage(message: WebRTCMessage, recipientPublicKey?: CryptoKey) {
        if (!this.sessionId) return;

        try {
            await this.waitForMQTTConnection();

            const topic = contentTopic({ sessionId: this.sessionId });

            let payloadToSend: string;

            if (recipientPublicKey) {
                // Encrypt the message for the recipient
                payloadToSend = await this.encryptMessage(message, recipientPublicKey);
                console.log('Sending encrypted MQTT message:', message.type, 'to topic:', topic);
            } else {
                // Send unencrypted (for public key advertisement)
                payloadToSend = JSON.stringify(message);
                console.log('Sending public MQTT message:', message.type, 'to topic:', topic);
            }

            this.client.publish(topic, payloadToSend, (error) => {
                if (error) {
                    console.error('Error publishing MQTT message:', error);
                } else {
                    console.log('MQTT message sent successfully:', message.type);
                }
            });
        } catch (error) {
            console.error('Failed to send MQTT message:', error);
        }
    }

    private async handleMQTTMessage(messageStr: string) {
        try {
            let message: WebRTCMessage;

            // Try to parse as JSON first (unencrypted public key advertisement)
            try {
                message = JSON.parse(messageStr);
            } catch {
                // If JSON parsing fails, try to decrypt
                message = await this.decryptMessage(messageStr);
            }

            console.log('Processing MQTT message:', message.type, 'isInitiator:', this.isInitiator);

            // Ignore messages from ourselves
            if (
                message.sessionId === this.sessionId &&
                message.type === 'pubkey' &&
                this.isInitiator
            ) {
                console.log('Ignoring own pubkey message');

                return;
            }

            // If we're the initiator and this is any message from someone else, re-publish our pubkey
            // This ensures new subscribers get our public key
            if (
                this.isInitiator &&
                message.sessionId === this.sessionId &&
                message.type !== 'pubkey'
            ) {
                console.log('Detected peer activity, re-publishing pubkey...');
                await this.publishPublicKey();
            }

            switch (message.type) {
                case 'ping':
                    if (this.isInitiator) {
                        console.log('Received ping from wallet, re-publishing pubkey...');
                        await this.publishPublicKey();
                    }

                    break;

                case 'pubkey':
                    if (!this.isInitiator) {
                        console.log('Received public key from dApp, verifying...');
                        const publicKeyData = new Uint8Array(
                            atob(message.payload.publicKey)
                                .split('')
                                .map((char) => char.charCodeAt(0))
                        );

                        this.peerPublicKey = await this.importPublicKey(publicKeyData.buffer);

                        // Verify the public key hash
                        const computedHash = await this.computePublicKeyHash(this.peerPublicKey);

                        console.log(
                            'Expected hash:',
                            this.pubkeyHash,
                            'Computed hash:',
                            computedHash
                        );

                        if (computedHash !== this.pubkeyHash) {
                            console.error(
                                'Public key hash mismatch! Expected:',
                                this.pubkeyHash,
                                'Got:',
                                computedHash
                            );

                            return;
                        }

                        console.log('Public key verified, sending hello message...');
                        // Send hello message encrypted with dApp's public key
                        await this.sendHelloMessage();
                    } else {
                        console.log('Ignoring pubkey message (we are the initiator)');
                    }

                    break;

                case 'hello':
                    if (this.isInitiator) {
                        console.log('Received hello from wallet, extracting public key...');
                        const publicKeyData = new Uint8Array(
                            atob(message.payload.publicKey)
                                .split('')
                                .map((char) => char.charCodeAt(0))
                        );

                        this.peerPublicKey = await this.importPublicKey(publicKeyData.buffer);
                        console.log('Wallet public key imported, starting WebRTC...');

                        // Start WebRTC connection
                        await this.createWebRTCOffer();
                    } else {
                        console.log('Ignoring hello message (we are not the initiator)');
                    }

                    break;

                case 'webrtc-offer':
                    if (!this.isInitiator) {
                        console.log('Received WebRTC offer');
                        await this.handleWebRTCOffer(message.payload);
                    }

                    break;

                case 'webrtc-answer':
                    if (this.isInitiator) {
                        console.log('Received WebRTC answer');
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
            console.error('Error handling MQTT message:', error);
        }
    }

    private async publishPublicKey() {
        if (!this.publicKey || !this.sessionId) return;

        const exportedKey = await this.exportPublicKey(this.publicKey);
        const publicKeyBase64 = btoa(
            String.fromCharCode.apply(null, Array.from(new Uint8Array(exportedKey)))
        );

        await this.sendMQTTMessage({
            type: 'pubkey',
            payload: {
                publicKey: publicKeyBase64,
                dAppInfo: {
                    name: 'Open Lavatory dApp',
                    url: typeof window !== 'undefined' ? window.location?.origin : 'unknown',
                },
            },
            sessionId: this.sessionId,
            timestamp: Date.now(),
        });
    }

    private async sendHelloMessage() {
        if (!this.publicKey || !this.peerPublicKey) return;

        const exportedKey = await this.exportPublicKey(this.publicKey);
        const publicKeyBase64 = btoa(
            String.fromCharCode.apply(null, Array.from(new Uint8Array(exportedKey)))
        );

        await this.sendMQTTMessage(
            {
                type: 'hello',
                payload: {
                    publicKey: publicKeyBase64,
                    walletInfo: {
                        name: 'Open Lavatory Wallet',
                        version: '1.0.0',
                    },
                },
                sessionId: this.sessionId!,
                timestamp: Date.now(),
            },
            this.peerPublicKey
        );
    }

    private async createWebRTCOffer() {
        if (!this.peerConnection || !this.peerPublicKey) return;

        try {
            console.log('Creating WebRTC offer...');
            const offer = await this.peerConnection.createOffer();

            await this.peerConnection.setLocalDescription(offer);

            console.log('Sending WebRTC offer');
            await this.sendMQTTMessage(
                {
                    type: 'webrtc-offer',
                    payload: offer,
                    sessionId: this.sessionId!,
                    timestamp: Date.now(),
                },
                this.peerPublicKey
            );

            this.setConnectionTimeout();
        } catch (error) {
            console.error('Error creating WebRTC offer:', error);
            this.retryWebRTCConnection();
        }
    }

    private async handleWebRTCOffer(offer: RTCSessionDescriptionInit) {
        if (!this.peerConnection || !this.peerPublicKey) return;

        try {
            console.log('Handling WebRTC offer...');
            await this.peerConnection.setRemoteDescription(offer);

            for (const candidate of this.pendingICECandidates) {
                await this.peerConnection.addIceCandidate(candidate);
            }
            this.pendingICECandidates = [];

            const answer = await this.peerConnection.createAnswer();

            await this.peerConnection.setLocalDescription(answer);

            console.log('Sending WebRTC answer');
            await this.sendMQTTMessage(
                {
                    type: 'webrtc-answer',
                    payload: answer,
                    sessionId: this.sessionId!,
                    timestamp: Date.now(),
                },
                this.peerPublicKey
            );

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

    // Debug helper to test URL generation
    async _testURLGeneration() {
        const sessionId = this._generateSessionId();
        const keyPair = await this.generateKeyPair();
        const pubkeyHash = await this.computePublicKeyHash(keyPair.publicKey);

        const url = encodeConnectionURL({
            sessionId,
            pubkeyHash,
        });

        console.log('Generated URL:', url);
        console.log('Decoded:', decodeConnectionURL(url));

        return url;
    }

    // Peer A: Initialize session and generate openLVUrl
    async initSession(): Promise<{ openLVUrl: string }> {
        this.isInitiator = true;
        this.sessionId = this._generateSessionId();

        // Generate ECDH keypair
        const keyPair = await this.generateKeyPair();

        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;

        // Compute public key hash
        this.pubkeyHash = await this.computePublicKeyHash(this.publicKey);

        const topic = contentTopic({ sessionId: this.sessionId });

        console.log('Initializing session with topic:', topic);

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error('Error subscribing to topic:', error);
            } else {
                console.log('Successfully subscribed to topic:', topic);

                // Publish public key after subscription
                setTimeout(async () => {
                    const exportedKey = await this.exportPublicKey(this.publicKey!);
                    const publicKeyBase64 = btoa(
                        String.fromCharCode.apply(null, Array.from(new Uint8Array(exportedKey)))
                    );

                    await this.sendMQTTMessage({
                        type: 'pubkey',
                        payload: {
                            publicKey: publicKeyBase64,
                            dAppInfo: {
                                name: 'Open Lavatory dApp',
                                url: window.location?.origin || 'unknown',
                            },
                        },
                        sessionId: this.sessionId!,
                        timestamp: Date.now(),
                    });
                }, 1000);
            }
        });

        this.setupMessageHandler();
        await this.setupPeerConnection();

        const openLVUrl = encodeConnectionURL({
            sessionId: this.sessionId,
            pubkeyHash: this.pubkeyHash,
        });

        return {
            openLVUrl,
        };
    }

    // Peer B: Connect to session using openLVUrl
    async connectToSession(config: { openLVUrl: string; onMessage?: (message: string) => void }) {
        this.isInitiator = false;
        const { sessionId, pubkeyHash } = decodeConnectionURL(config.openLVUrl);

        this.sessionId = sessionId;
        this.pubkeyHash = pubkeyHash;

        // Generate ECDH keypair
        const keyPair = await this.generateKeyPair();

        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;

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

                // Send a ping to request the dApp's public key
                setTimeout(() => {
                    console.log('Sending ping to request pubkey...');
                    this.sendMQTTMessage({
                        type: 'ping',
                        payload: 'request-pubkey',
                        sessionId: this.sessionId!,
                        timestamp: Date.now(),
                    });
                }, 1000);
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
    sendMessage(message: string) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(message);
        } else if (this.sessionId && this.peerPublicKey) {
            this.sendMQTTMessage(
                {
                    type: 'data',
                    payload: message,
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                },
                this.peerPublicKey
            );
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
