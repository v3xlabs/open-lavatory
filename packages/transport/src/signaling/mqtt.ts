import mqtt from 'mqtt';

export type SignalingMessage = {
    type: 'ping' | 'pubkey' | 'hello' | 'webrtc-offer' | 'webrtc-answer' | 'ice-candidate' | 'data';
    payload: any;
    sessionId: string;
    timestamp: number;
    senderId: string;
};

export type SignalingConfig = {
    mqttUrl?: string;
    protocol?: 'mqtt' | 'waku' | 'nostr';
};

export type MessageHandler = (message: SignalingMessage) => void;

export const contentTopic = ({ sessionId }: { sessionId: string }) =>
    `/openlv/session/${sessionId}`;

export class MQTTSignaling {
    private client: mqtt.MqttClient;
    private sessionId?: string;
    private messageHandler?: MessageHandler;
    private isConnected = false;
    private mqttUrl: string;

    constructor(config?: SignalingConfig) {
        this.mqttUrl = config?.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt';
        this.client = mqtt.connect(this.mqttUrl);
        this.setupHandlers();
    }

    private setupHandlers() {
        this.client.on('connect', () => {
            console.log('MQTT: Connected to broker');
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            console.error('MQTT: Connection error:', error);
            this.isConnected = false;
        });

        this.client.on('disconnect', () => {
            console.log('MQTT: Disconnected from broker');
            this.isConnected = false;
        });

        this.client.on('message', (topic, message) => {
            if (this.sessionId && topic === contentTopic({ sessionId: this.sessionId })) {
                console.log('MQTT: Received message on topic', topic);
                this.handleMessage(message.toString());
            }
        });
    }

    private handleMessage(messageStr: string) {
        try {
            const message: SignalingMessage = JSON.parse(messageStr);

            console.log('MQTT: Processing message:', message.type);

            if (this.messageHandler) {
                this.messageHandler(message);
            }
        } catch (error) {
            console.error('MQTT: Failed to parse message:', error);
        }
    }

    async subscribe(sessionId: string, handler: MessageHandler): Promise<void> {
        this.sessionId = sessionId;
        this.messageHandler = handler;

        const topic = contentTopic({ sessionId });

        return new Promise((resolve, reject) => {
            this.client.subscribe(topic, (error) => {
                if (error) {
                    console.error('MQTT: Error subscribing to topic:', error);
                    reject(error);
                } else {
                    console.log('MQTT: Successfully subscribed to topic:', topic);
                    resolve();
                }
            });
        });
    }

    async publish(message: SignalingMessage): Promise<void> {
        if (!this.sessionId || !this.isConnected) {
            throw new Error('MQTT: Not connected or no session ID');
        }

        const topic = contentTopic({ sessionId: this.sessionId });
        const payload = JSON.stringify(message);

        return new Promise((resolve, reject) => {
            this.client.publish(topic, payload, (error) => {
                if (error) {
                    console.error('MQTT: Error publishing message:', error);
                    reject(error);
                } else {
                    console.log('MQTT: Message sent successfully:', message.type);
                    resolve();
                }
            });
        });
    }

    async waitForConnection(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('MQTT: Connection timeout'));
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

    reconnect(): void {
        if (!this.isConnected) {
            console.log('MQTT: Reconnecting...');
            this.client = mqtt.connect(this.mqttUrl);
            this.setupHandlers();

            // Re-subscribe if we have a session
            if (this.sessionId && this.messageHandler) {
                this.client.on('connect', () => {
                    this.subscribe(this.sessionId!, this.messageHandler!);
                });
            }
        }
    }

    disconnect(): void {
        if (this.client) {
            this.client.end(true);
        }

        this.isConnected = false;
        this.sessionId = undefined;
        this.messageHandler = undefined;
    }

    get connected(): boolean {
        return this.isConnected;
    }
}
