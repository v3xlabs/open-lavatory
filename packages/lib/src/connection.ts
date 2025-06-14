import { MQTTSignaling, type SignalingMessage } from './signaling/mqtt.js';
import type {
    ConnectionPayload,
    ConnectionPhase,
    ConnectionState,
    DAppInfo,
    JsonRpcRequest,
    JsonRpcResponse,
    MessageHandler,
    PhaseHandler,
    SessionConfig,
    WalletInfo,
} from './types.js';
import { EncryptionUtils } from './utils/encryption.js';

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
        // Fallback to legacy regex parsing
        const legacyMatch = url.match(/openlv:\/\/([^?]+)\?(?:sharedKey|k|h)=([^&]+)/) ?? [];
        const [, sessionId, keyOrHash] = legacyMatch;

        return {
            sessionId,
            pubkeyHash: keyOrHash,
        };
    }
};

export class OpenLVConnection {
    private sessionId?: string;
    private pubkeyHash?: string;
    private privateKey?: CryptoKey;
    private publicKey?: CryptoKey;
    private peerPublicKey?: CryptoKey;
    private peerConnection?: RTCPeerConnection;
    private dataChannel?: RTCDataChannel;
    private signaling: MQTTSignaling;
    private isInitiator = false;
    private connectionState: ConnectionState = 'disconnected';
    private pendingICECandidates: RTCIceCandidateInit[] = [];
    private webrtcRetryCount = 0;
    private maxWebrtcRetries = 3;
    private webrtcRetryInterval?: NodeJS.Timeout;
    private connectionTimeout?: NodeJS.Timeout;

    // Event handlers
    private phaseHandlers: PhaseHandler[] = [];
    private messageHandlers: MessageHandler[] = [];
    private errorHandlers: ((error: Error) => void)[] = [];

    // Connection state flags
    private hasSharedPublicKey = false;
    private peerRequested = false;

    constructor(config?: SessionConfig) {
        this.signaling = new MQTTSignaling(config);
    }

    private updateConnectionState(newState: ConnectionState, description: string) {
        const oldState = this.connectionState;

        this.connectionState = newState;

        console.log(`Connection: ${oldState} → ${newState} (${description})`);

        const phase: ConnectionPhase = {
            state: newState,
            description,
            timestamp: Date.now(),
        };

        // Notify phase handlers
        this.phaseHandlers.forEach((handler) => handler(phase));

        // Handle state transitions
        if (newState === 'webrtc-connected' && oldState !== 'webrtc-connected') {
            this.onWebRTCConnected();
        } else if (oldState === 'webrtc-connected' && newState !== 'webrtc-connected') {
            this.onWebRTCDisconnected();
        }
    }

    private onWebRTCConnected() {
        console.log('WebRTC connected - closing MQTT to save resources');
        this.clearTimeouts();
        this.signaling.disconnect();
    }

    private onWebRTCDisconnected() {
        console.log('WebRTC disconnected - reopening MQTT for fallback');
        this.signaling.reconnect();
    }

    private async handleSignalingMessage(message: SignalingMessage) {
        try {
            console.log(`Processing: ${message.type} (initiator: ${this.isInitiator})`);

            // Ignore our own messages
            if (
                message.sessionId === this.sessionId &&
                message.type === 'pubkey' &&
                this.isInitiator
            ) {
                return;
            }

            switch (message.type) {
                case 'ping':
                    await this.handlePing();
                    break;

                case 'pubkey':
                    await this.handlePublicKey(message);
                    break;

                case 'hello':
                    await this.handleHello(message);
                    break;

                case 'webrtc-offer':
                    await this.handleWebRTCOffer(message);
                    break;

                case 'webrtc-answer':
                    await this.handleWebRTCAnswer(message);
                    break;

                case 'ice-candidate':
                    await this.handleICECandidate(message);
                    break;

                case 'data':
                    await this.handleDataMessage(message);
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
            this.errorHandlers.forEach((handler) => handler(error as Error));
        }
    }

    private async handlePing() {
        if (this.isInitiator && !this.hasSharedPublicKey) {
            console.log('Received ping from wallet - peer is requesting public key');
            this.peerRequested = true;
            this.updateConnectionState('pairing', 'Wallet detected, sharing public key');
            await this.sharePublicKey();
        }
    }

    private async handlePublicKey(message: SignalingMessage) {
        if (this.isInitiator) return; // Only wallet processes public keys

        console.log('Received public key from dApp, verifying...');
        this.updateConnectionState('key-exchange', 'Verifying dApp public key');

        const publicKeyData = await EncryptionUtils.publicKeyFromBase64(message.payload.publicKey);
        const computedHash = await EncryptionUtils.computePublicKeyHashFromRaw(
            new Uint8Array(await EncryptionUtils.exportPublicKey(publicKeyData))
        );

        if (computedHash !== this.pubkeyHash) {
            throw new Error(
                `Public key hash mismatch! Expected: ${this.pubkeyHash}, Got: ${computedHash}`
            );
        }

        this.peerPublicKey = publicKeyData;
        this.updateConnectionState('key-exchange', 'Sending encrypted hello message');
        await this.sendHello();
    }

    private async handleHello(message: SignalingMessage) {
        if (!this.isInitiator) return; // Only dApp processes hello messages

        console.log('Received hello from wallet');
        this.updateConnectionState('key-exchange', 'Received wallet hello, starting WebRTC');

        // Decrypt the hello message
        const decryptedMessage = await EncryptionUtils.decryptMessage(
            message.payload,
            this.privateKey!
        );

        this.peerPublicKey = await EncryptionUtils.publicKeyFromBase64(decryptedMessage.publicKey);
        this.updateConnectionState('webrtc-negotiating', 'Creating WebRTC offer');
        await this.createWebRTCOffer();
    }

    private async handleWebRTCOffer(message: SignalingMessage) {
        if (this.isInitiator) return;

        console.log('Received WebRTC offer');
        this.updateConnectionState('webrtc-negotiating', 'Processing WebRTC offer');

        const decryptedOffer = await EncryptionUtils.decryptMessage(
            message.payload,
            this.privateKey!
        );

        await this.peerConnection!.setRemoteDescription(decryptedOffer);

        // Add any pending ICE candidates
        for (const candidate of this.pendingICECandidates) {
            await this.peerConnection!.addIceCandidate(candidate);
        }
        this.pendingICECandidates = [];

        const answer = await this.peerConnection!.createAnswer();

        await this.peerConnection!.setLocalDescription(answer);

        // Send encrypted answer
        const encryptedAnswer = await EncryptionUtils.encryptMessage(
            answer,
            this.peerPublicKey!,
            this.privateKey!,
            this.publicKey!
        );

        await this.signaling.publish({
            type: 'webrtc-answer',
            payload: encryptedAnswer,
            sessionId: this.sessionId!,
            timestamp: Date.now(),
        });
    }

    private async handleWebRTCAnswer(message: SignalingMessage) {
        if (!this.isInitiator) return;

        console.log('Received WebRTC answer');
        this.updateConnectionState('webrtc-negotiating', 'Processing WebRTC answer');

        const decryptedAnswer = await EncryptionUtils.decryptMessage(
            message.payload,
            this.privateKey!
        );

        await this.peerConnection!.setRemoteDescription(decryptedAnswer);

        // Add any pending ICE candidates
        for (const candidate of this.pendingICECandidates) {
            await this.peerConnection!.addIceCandidate(candidate);
        }
        this.pendingICECandidates = [];
    }

    private async handleICECandidate(message: SignalingMessage) {
        const decryptedCandidate = await EncryptionUtils.decryptMessage(
            message.payload,
            this.privateKey!
        );

        if (this.peerConnection!.remoteDescription) {
            await this.peerConnection!.addIceCandidate(decryptedCandidate);
        } else {
            this.pendingICECandidates.push(decryptedCandidate);
        }
    }

    private async handleDataMessage(message: SignalingMessage) {
        const decryptedData = await EncryptionUtils.decryptMessage(
            message.payload,
            this.privateKey!
        );

        // Handle JSON-RPC request
        const request: JsonRpcRequest = decryptedData;

        console.log('Received JSON-RPC request:', request.method);

        // Notify message handlers
        for (const handler of this.messageHandlers) {
            try {
                const result = await handler(request);

                // Send response back
                const response: JsonRpcResponse = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result,
                };

                await this.sendMessage(response);
            } catch (error) {
                // Send error response
                const errorResponse: JsonRpcResponse = {
                    jsonrpc: '2.0',
                    id: request.id,
                    error: {
                        code: -32603,
                        message: 'Internal error',
                        data: error instanceof Error ? error.message : String(error),
                    },
                };

                await this.sendMessage(errorResponse);
            }
        }
    }

    private async sharePublicKey() {
        if (!this.publicKey || !this.sessionId || this.hasSharedPublicKey) return;

        const publicKeyBase64 = await EncryptionUtils.publicKeyToBase64(this.publicKey);

        const dAppInfo: DAppInfo = {
            name: 'Open Lavatory dApp',
            url: typeof window !== 'undefined' ? window.location?.origin : 'unknown',
        };

        await this.signaling.publish({
            type: 'pubkey',
            payload: {
                publicKey: publicKeyBase64,
                dAppInfo,
            },
            sessionId: this.sessionId,
            timestamp: Date.now(),
        });

        this.hasSharedPublicKey = true;
    }

    private async sendHello() {
        if (!this.publicKey || !this.peerPublicKey) return;

        const publicKeyBase64 = await EncryptionUtils.publicKeyToBase64(this.publicKey);

        const walletInfo: WalletInfo = {
            name: 'Open Lavatory Wallet',
            version: '1.0.0',
        };

        const helloMessage = {
            publicKey: publicKeyBase64,
            walletInfo,
        };

        const encryptedHello = await EncryptionUtils.encryptMessage(
            helloMessage,
            this.peerPublicKey,
            this.privateKey!,
            this.publicKey
        );

        await this.signaling.publish({
            type: 'hello',
            payload: encryptedHello,
            sessionId: this.sessionId!,
            timestamp: Date.now(),
        });
    }

    private async setupWebRTC() {
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com:3478' },
            {
                urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject',
            },
        ];

        this.peerConnection = new RTCPeerConnection({
            iceServers,
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
        });

        // Connection state handlers
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection!.connectionState;

            console.log('WebRTC connection state:', state);

            if (state === 'connected') {
                this.updateConnectionState('webrtc-connected', 'Direct P2P connection established');
            } else if (state === 'failed') {
                this.retryWebRTC();
            } else if (state === 'connecting') {
                this.updateConnectionState('webrtc-negotiating', 'Establishing P2P connection...');
            }
        };

        // ICE candidate handler
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate && this.peerPublicKey) {
                const encryptedCandidate = await EncryptionUtils.encryptMessage(
                    event.candidate,
                    this.peerPublicKey,
                    this.privateKey!,
                    this.publicKey!
                );

                await this.signaling.publish({
                    type: 'ice-candidate',
                    payload: encryptedCandidate,
                    sessionId: this.sessionId!,
                    timestamp: Date.now(),
                });
            }
        };

        // Data channel setup
        if (this.isInitiator) {
            this.dataChannel = this.peerConnection.createDataChannel('openlv-data');
            this.setupDataChannel();
        } else {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };
        }
    }

    private setupDataChannel() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log('WebRTC data channel opened');
            this.updateConnectionState('webrtc-connected', 'P2P data channel ready');
        };

        this.dataChannel.onmessage = async (event) => {
            try {
                const request: JsonRpcRequest = JSON.parse(event.data);

                console.log('Received P2P JSON-RPC request:', request.method);

                // Handle the request
                for (const handler of this.messageHandlers) {
                    try {
                        const result = await handler(request);

                        const response: JsonRpcResponse = {
                            jsonrpc: '2.0',
                            id: request.id,
                            result,
                        };

                        this.dataChannel!.send(JSON.stringify(response));
                    } catch (error) {
                        const errorResponse: JsonRpcResponse = {
                            jsonrpc: '2.0',
                            id: request.id,
                            error: {
                                code: -32603,
                                message: 'Internal error',
                                data: error instanceof Error ? error.message : String(error),
                            },
                        };

                        this.dataChannel!.send(JSON.stringify(errorResponse));
                    }
                }
            } catch (error) {
                console.error('Error handling P2P message:', error);
            }
        };

        this.dataChannel.onclose = () => {
            this.updateConnectionState('mqtt-connected', 'P2P connection lost, using relay');
        };
    }

    private async createWebRTCOffer() {
        if (!this.peerConnection || !this.peerPublicKey) return;

        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);

        const encryptedOffer = await EncryptionUtils.encryptMessage(
            offer,
            this.peerPublicKey,
            this.privateKey!,
            this.publicKey!
        );

        await this.signaling.publish({
            type: 'webrtc-offer',
            payload: encryptedOffer,
            sessionId: this.sessionId!,
            timestamp: Date.now(),
        });

        this.setConnectionTimeout();
    }

    private retryWebRTC() {
        if (this.webrtcRetryCount >= this.maxWebrtcRetries) {
            console.error('Max WebRTC retries reached, falling back to MQTT');
            this.updateConnectionState('mqtt-connected', 'WebRTC failed, using relay fallback');

            return;
        }

        this.webrtcRetryCount++;
        console.log(`Retrying WebRTC (${this.webrtcRetryCount}/${this.maxWebrtcRetries})`);

        this.webrtcRetryInterval = setTimeout(async () => {
            await this.setupWebRTC();

            if (this.isInitiator) {
                await this.createWebRTCOffer();
            }
        }, 2000 * this.webrtcRetryCount);
    }

    private setConnectionTimeout() {
        this.clearTimeouts();
        this.connectionTimeout = setTimeout(() => {
            console.warn('WebRTC connection timeout, retrying...');
            this.retryWebRTC();
        }, 15000);
    }

    private clearTimeouts() {
        if (this.webrtcRetryInterval) {
            clearTimeout(this.webrtcRetryInterval);
            this.webrtcRetryInterval = undefined;
        }

        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = undefined;
        }

        this.webrtcRetryCount = 0;
    }

    // Public API methods

    async initSession(): Promise<{ openLVUrl: string }> {
        this.isInitiator = true;
        this.sessionId = crypto.randomUUID();

        // Generate keypair
        const keyPair = await EncryptionUtils.generateKeyPair();

        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;
        this.pubkeyHash = await EncryptionUtils.computePublicKeyHash(this.publicKey);

        this.updateConnectionState('mqtt-connecting', 'Connecting to signaling server');

        // Setup signaling
        await this.signaling.waitForConnection();
        await this.signaling.subscribe(this.sessionId, (message) =>
            this.handleSignalingMessage(message)
        );

        this.updateConnectionState('pairing', 'Waiting for wallet to connect');

        // Setup WebRTC
        await this.setupWebRTC();

        const openLVUrl = encodeConnectionURL({
            sessionId: this.sessionId,
            pubkeyHash: this.pubkeyHash,
        });

        return { openLVUrl };
    }

    async connectToSession(openLVUrl: string): Promise<void> {
        this.isInitiator = false;
        const { sessionId, pubkeyHash } = decodeConnectionURL(openLVUrl);

        this.sessionId = sessionId;
        this.pubkeyHash = pubkeyHash;

        // Generate keypair
        const keyPair = await EncryptionUtils.generateKeyPair();

        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;

        this.updateConnectionState('mqtt-connecting', 'Connecting to signaling server');

        // Setup signaling
        await this.signaling.waitForConnection();
        await this.signaling.subscribe(this.sessionId, (message) =>
            this.handleSignalingMessage(message)
        );

        this.updateConnectionState('pairing', 'Requesting dApp public key');

        // Setup WebRTC
        await this.setupWebRTC();

        // Send ping to request public key
        await this.signaling.publish({
            type: 'ping',
            payload: 'request-pubkey',
            sessionId: this.sessionId,
            timestamp: Date.now(),
        });
    }

    async sendMessage(message: JsonRpcRequest | JsonRpcResponse): Promise<void> {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            // Send via WebRTC
            this.dataChannel.send(JSON.stringify(message));
        } else if (this.peerPublicKey && this.signaling.connected) {
            // Send via encrypted MQTT
            const encryptedMessage = await EncryptionUtils.encryptMessage(
                message,
                this.peerPublicKey,
                this.privateKey!,
                this.publicKey!
            );

            await this.signaling.publish({
                type: 'data',
                payload: encryptedMessage,
                sessionId: this.sessionId!,
                timestamp: Date.now(),
            });
        } else {
            throw new Error('No connection available to send message');
        }
    }

    // Event handlers
    onPhaseChange(handler: PhaseHandler): void {
        this.phaseHandlers.push(handler);
    }

    onMessage(handler: MessageHandler): void {
        this.messageHandlers.push(handler);
    }

    onError(handler: (error: Error) => void): void {
        this.errorHandlers.push(handler);
    }

    // Status getters
    getConnectionStatus(): 'disconnected' | 'mqtt-only' | 'webrtc-connected' {
        switch (this.connectionState) {
            case 'webrtc-connected':
                return 'webrtc-connected';
            case 'mqtt-connected':
            case 'mqtt-connecting':
            case 'pairing':
            case 'key-exchange':
            case 'webrtc-negotiating':
                return 'mqtt-only';
            default:
                return 'disconnected';
        }
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    disconnect(): void {
        this.clearTimeouts();

        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.signaling.disconnect();

        this.updateConnectionState('disconnected', 'Connection closed');

        // Reset state
        this.hasSharedPublicKey = false;
        this.peerRequested = false;
        this.pendingICECandidates = [];
    }
}
