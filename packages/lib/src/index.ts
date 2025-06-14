import mqtt from 'mqtt';

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
    private peerConnection?: RTCPeerConnection;
    private dataChannel?: RTCDataChannel;
    private messageHandlers: MessageHandler[] = [];
    private isInitiator = false;

    constructor(config?: SessionConfig) {
        this.client = mqtt.connect(config?.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt');
        this.setupMQTTHandlers();
    }

    private setupMQTTHandlers() {
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
        });

        this.client.on('error', (error) => {
            console.error('MQTT connection error:', error);
        });
    }

    private setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

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
                this.sendMQTTMessage({
                    type: 'ice-candidate',
                    payload: event.candidate,
                    sessionId: this.sessionId!,
                    sharedKey: this.sharedKey!,
                });
            }
        };
    }

    private setupDataChannelHandlers(dataChannel: RTCDataChannel) {
        dataChannel.onopen = () => {
            console.log('WebRTC data channel opened');
        };

        dataChannel.onmessage = (event) => {
            console.log('Received WebRTC message:', event.data);
            this.messageHandlers.forEach((handler) => handler(event.data));
        };

        dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    private sendMQTTMessage(message: WebRTCMessage) {
        if (!this.sessionId) return;

        const topic = contentTopic({ sessionId: this.sessionId });

        this.client.publish(topic, JSON.stringify(message));
    }

    private async handleMQTTMessage(messageStr: string) {
        try {
            const message: WebRTCMessage = JSON.parse(messageStr);

            // Verify shared key
            if (message.sharedKey !== this.sharedKey) {
                console.warn('Invalid shared key, ignoring message');

                return;
            }

            switch (message.type) {
                case 'hello':
                    if (this.isInitiator) {
                        // Peer A receives hello from Peer B, start WebRTC offer
                        await this.createWebRTCOffer();
                    }

                    break;

                case 'webrtc-offer':
                    if (!this.isInitiator) {
                        // Peer B receives offer from Peer A
                        await this.handleWebRTCOffer(message.payload);
                    }

                    break;

                case 'webrtc-answer':
                    if (this.isInitiator) {
                        // Peer A receives answer from Peer B
                        await this.handleWebRTCAnswer(message.payload);
                    }

                    break;

                case 'ice-candidate':
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

    private async createWebRTCOffer() {
        if (!this.peerConnection) return;

        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);

        this.sendMQTTMessage({
            type: 'webrtc-offer',
            payload: offer,
            sessionId: this.sessionId!,
            sharedKey: this.sharedKey!,
        });
    }

    private async handleWebRTCOffer(offer: RTCSessionDescriptionInit) {
        if (!this.peerConnection) return;

        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();

        await this.peerConnection.setLocalDescription(answer);

        this.sendMQTTMessage({
            type: 'webrtc-answer',
            payload: answer,
            sessionId: this.sessionId!,
            sharedKey: this.sharedKey!,
        });
    }

    private async handleWebRTCAnswer(answer: RTCSessionDescriptionInit) {
        if (!this.peerConnection) return;

        await this.peerConnection.setRemoteDescription(answer);
    }

    private async handleICECandidate(candidate: RTCIceCandidateInit) {
        if (!this.peerConnection) return;

        await this.peerConnection.addIceCandidate(candidate);
    }

    _generateSessionId(): string {
        return crypto.randomUUID();
    }

    _generateSharedKey(): string {
        return crypto.randomUUID();
    }

    // Peer A: Initialize session and generate openLVUrl
    initSession(): { openLVUrl: string } {
        this.isInitiator = true;
        this.sessionId = this._generateSessionId();
        this.sharedKey = this._generateSharedKey();
        const topic = contentTopic({ sessionId: this.sessionId });

        this.client.subscribe(topic);
        this.client.on('message', (receivedTopic, message) => {
            if (receivedTopic === topic) {
                console.log('Received MQTT message on topic', receivedTopic);
                this.handleMQTTMessage(message.toString());
            }
        });

        this.setupPeerConnection();

        const openLVUrl = encodeConnectionURL({
            sessionId: this.sessionId,
            sharedKey: this.sharedKey,
        });

        return {
            openLVUrl,
        };
    }

    // Peer B: Connect to session using openLVUrl
    connectToSession(config: { openLVUrl: string; onMessage?: (message: string) => void }) {
        this.isInitiator = false;
        const { sessionId, sharedKey } = decodeConnectionURL(config.openLVUrl);

        this.sessionId = sessionId;
        this.sharedKey = sharedKey;

        if (config.onMessage) {
            this.messageHandlers.push(config.onMessage);
        }

        const topic = contentTopic({ sessionId });

        this.client.subscribe(topic);
        this.client.on('message', (receivedTopic, message) => {
            if (receivedTopic === topic) {
                console.log('Received MQTT message on topic', receivedTopic);
                this.handleMQTTMessage(message.toString());
            }
        });

        this.setupPeerConnection();

        // Send hello message to notify Peer A
        this.sendMQTTMessage({
            type: 'hello',
            payload: 'Hello from Peer B',
            sessionId,
            sharedKey,
        });
    }

    // Add message handler for peer-to-peer communication
    onMessage(handler: MessageHandler) {
        this.messageHandlers.push(handler);
    }

    // Send message via WebRTC data channel (preferred) or MQTT fallback
    sendMessage(message: string) {
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
        if (this.dataChannel) {
            this.dataChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        if (this.client) {
            this.client.end();
        }
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
