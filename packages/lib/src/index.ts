import mqtt from 'mqtt';

export type SessionConfig = {
    mqttUrl?: string;
};

export type ConnectionPayload = {
    sessionId: string;
    sharedKey: string;
};

export const contentTopic = ({ sessionId }: { sessionId: string }) =>
    `/my/topic/goes/here/${sessionId}`;

// include 'wss://test.mosquitto.org:8081/mqtt' later
// openlv://{sessionId}?sharedKey={sharedKey}
// openlv://abcdefg?sharedKey=1234567890
export const decodeConnectionURL = (url: string): ConnectionPayload => {
    // openlv://abcdefg?sharedKey=1234567890
    // regex to get sessionId and sharedKey
    const [, sessionId, sharedKey] = url.match(/openlv:\/\/([^\?]+)\?sharedKey=([^\&]+)/) ?? [];

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

    constructor(config?: SessionConfig) {
        this.client = mqtt.connect(config?.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt');
    }

    _generateSessionId(): string {
        return crypto.randomUUID();
    }

    _generateSharedKey(): string {
        return crypto.randomUUID();
    }

    initSession(): { openLVUrl: string } {
        const sessionId = this._generateSessionId();
        const sharedKey = this._generateSharedKey();
        const topic = contentTopic({ sessionId });

        this.client.subscribe(topic);

        const openLVUrl = encodeConnectionURL({
            sessionId,
            sharedKey,
        });

        return {
            openLVUrl,
        };
    }

    connectToSession(config: { openLVUrl: string; onMessage: (message: string) => void }) {
        const { sessionId, sharedKey } = decodeConnectionURL(config.openLVUrl);
        const topic = contentTopic({ sessionId });

        this.client.subscribe(topic);
        this.client.on('message', (topic, message) => {
            if (topic === topic) {
                console.log('Received message on topic', topic, message.toString());
                config.onMessage(message.toString());
            }
        });
    }
}

export const startConnection = (config: SessionConfig) => {
    const client = mqtt.connect(config.mqttUrl ?? 'wss://test.mosquitto.org:8081/mqtt');

    client.on('message', (topic, message) => {
        console.log('Received message on topic', topic, message.toString());
    });

    return {
        client,
        // topic is the content topic
        subscribe: (topic: string) => {
            client.subscribe(topic, (err, granted, packet) => {
                if (err) {
                    console.error('Error subscribing to topic', err);
                }

                console.log('Subscribed to topic', topic, granted, packet);
            });
        },
        // topic is the content topic
        publish: (topic: string, message: string) => {
            client.publish(topic, message, (err) => {
                if (err) {
                    console.error('Error publishing message', err);
                }
            });
        },
    };
};
