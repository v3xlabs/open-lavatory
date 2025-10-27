import { generateKeyPair } from '@openlv/core/encryption';
import { describe, expect, it } from 'vitest';

import type { CreateSignalLayerFn, SignalBaseProperties } from './base.js';
import { gundb } from './gundb/index.js';
import { mqtt } from './mqtt/index.js';
import { ntfy } from './ntfy/index.js';

const hKey = 'test';

const layers: [CreateSignalLayerFn, SignalBaseProperties][] = [
    [mqtt, { topic: 'mytesttopic1111', url: 'wss://test.mosquitto.org:8081/mqtt' }],
    [mqtt, { topic: 'mytesttopic1111', url: 'wss://mqtt-dashboard.com:8884/mqtt' }],
    [mqtt, { topic: 'mytesttopic1111', url: 'ws://broker.emqx.io:8083/mqtt' }],
    [ntfy, { topic: 'mytesttopic1111', url: 'https://ntfy.sh/' }],
    [gundb, { topic: 'mytesttopic1111', url: 'wss://try.axe.eco/gun' }],
];

describe('Signaling layers', () => {
    layers.forEach(([layer, props]) => {
        const layername = (layer as { __name?: string })['__name'] as string | undefined;

        it(`should create a signaling layer for ${layername} - ${props.url}`, async () => {
            const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
            const h = hKey;

            const signalingLayer = await layer(props);
            const signalA = await signalingLayer({
                h,
                rpDiscovered: (v) => console.log('rpKey', v),
                canEncrypt: () => true,
                encrypt: publicKey.encrypt,
                decrypt: decryptionKey.decrypt,
                publicKey,
                isHost: true,
            });
            const signalB = await signalingLayer({
                h,
                rpDiscovered: (v) => console.log('rpKey', v),
                canEncrypt: () => true,
                encrypt: publicKey.encrypt,
                decrypt: decryptionKey.decrypt,
                publicKey,
                isHost: false,
            });

            expect(signalA).toBeDefined();
            expect(signalB).toBeDefined();

            await Promise.all([signalA.setup(), signalB.setup()]);

            const messageReceivedA = new Promise<void>((resolve) => {
                signalA.subscribe((message) => {
                    console.log('messageReceivedA', message);
                    expect(message).toEqual({ data: 'test2' });
                    resolve();
                });
            });
            const messageReceivedB = new Promise<void>((resolve) => {
                signalB.subscribe((message) => {
                    console.log('messageReceivedB', message);
                    expect(message).toEqual({ data: 'test1' });
                    resolve();
                });
            });

            await signalA.send({ data: 'test1' });

            await messageReceivedB;

            await signalB.send({ data: 'test2' });

            await messageReceivedA;

            await signalA.teardown();
            await signalB.teardown();
        });
    });
});
