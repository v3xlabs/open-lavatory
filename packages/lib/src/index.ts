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

export const startSession = async (connection: SessionConfig) => {
    // TODO: generate sessionId
    const sessionId = 'abcdefg';
    const topic = contentTopic({ sessionId });

    const client = startConnection(connection);

    console.log('client', client);

    client.subscribe(topic, (err, granted) => {
        if (err) {
            console.error('Error subscribing to topic', err);
        }
    });

    const payload = encodeConnectionURL({
        sessionId: 'abcdefg',
        sharedKey: '1234567890',
    });

    console.log('payload', payload);

    setInterval(() => {
        client.publish(topic, 'hello ' + Math.round(Math.random() * 1000));
    }, 3000);
};
