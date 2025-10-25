import type { MqttClient } from 'mqtt';
import { connect } from 'mqtt';

import { SignalBaseProperties } from '../base.js';
import { createSignalingLayer, SignalLayerCreator } from '../index.js';

/**
 * Signaling over MQTT
 */
export const mqtt: SignalLayerCreator = ({
    url = 'wss://test.mosquitto.org:8081/mqtt',
    topic,
}: SignalBaseProperties) => {
    let connection: MqttClient | undefined;

    return createSignalingLayer({
        type: 'mqtt',
        setup() {
            connection = connect(url);
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
        subscribe(handler) {
            if (!connection) {
                throw new Error('MQTT: No connection to subscribe to');
            }

            console.log('MQTT: Subscribing to topic', topic);

            connection.subscribe(topic);

            connection.on('message', (receivedTopic, message) => {
                console.log('MQTT: Received message on topic', topic);

                if (receivedTopic !== topic) return;

                const decoded = new TextDecoder().decode(message);

                handler(decoded);
            });
        },
    });
};

Object.defineProperty(mqtt, '__name', { value: 'mqtt' });
