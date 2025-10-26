import type { MqttClient } from 'mqtt';
import MQTT from 'mqtt';

import { CreateSignalLayerFn, SignalBaseProperties } from '../base.js';
import { createSignalingLayer } from '../index.js';

/**
 * Signaling over MQTT
 */
export const mqtt: CreateSignalLayerFn = ({
    url = 'wss://test.mosquitto.org:8081/mqtt',
    topic,
}: SignalBaseProperties) => {
    let connection: MqttClient | undefined;

    return createSignalingLayer({
        type: 'mqtt',
        async setup() {
            connection = await MQTT.connectAsync(url);
        },
        teardown() {
            connection?.end();
            connection = undefined;
        },
        async publish(payload) {
            if (!connection) {
                throw new Error('MQTT: No connection to publish to');
            }

            const encoded = new TextEncoder().encode(payload);

            connection?.publish(topic, Buffer.from(encoded));
        },
        async subscribe(handler) {
            if (!connection) {
                throw new Error('MQTT: No connection to subscribe to');
            }

            console.log('MQTT: Subscribing to topic', topic);

            connection.on('message', (receivedTopic, message) => {
                console.log('MQTT: Received message on topic', topic);

                if (receivedTopic !== topic) return;

                const decoded = new TextDecoder().decode(message);

                handler(decoded);
            });

            return new Promise((resolve, reject) => {
                connection?.subscribe(topic, (err) => {
                    if (err) {
                        console.error('MQTT: Error subscribing to topic', err);
                        reject(err);
                    }

                    resolve();
                });
            });
        },
    });
};

Object.defineProperty(mqtt, '__name', { value: 'mqtt' });
