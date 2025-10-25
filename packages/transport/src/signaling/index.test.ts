import { describe, expect, it } from 'vitest';

import { SignalBaseProperties } from './base.js';
import { SignalingLayer } from './index.js';
import { mqtt } from './mqtt/index.js';
import { ntfy } from './ntfy/index.js';

const hKey = '';

const layers: [(x: SignalBaseProperties) => SignalingLayer, SignalBaseProperties][] = [
    [mqtt, { topic: 'mytesttopic1111', url: 'wss://test.mosquitto.org:8081/mqtt' }],
    [ntfy, { topic: 'mytesttopic1111', url: 'https://ntfy.sh/' }],
];

describe('Signaling layers', () => {
    layers.forEach(([layer, props]) => {
        const layername = (layer as { __name?: string })['__name'] as string | undefined;

        it(`should create a signaling layer for ${layername} with encryption`, async () => {
            const signalingLayer = await layer(props)({
                h: hKey,
                sessionId: props.topic,
                rpDiscovered(rpKey) {
                    //
                    console.log('rpKey', rpKey);
                },
                canEncrypt() {
                    return true;
                },
                // For testing purposes well use base64
                encrypt: btoa,
                decrypt: atob,
                publicKey: '',
                isHost: true,
            });

            expect(signalingLayer).toBeDefined();

            await signalingLayer.setup();

            const messageReceived = new Promise<string>((resolve) => {
                signalingLayer.subscribe((message) => {
                    expect(message).toBe('test');
                    resolve(message);
                });
            });

            console.log('sending message');

            await signalingLayer.send('test');

            await messageReceived;

            await signalingLayer.teardown();
        });
    });
});
