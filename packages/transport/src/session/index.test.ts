import { describe, expect, test } from 'vitest';

import { decodeConnectionURL, encodeConnectionURL } from '../utils/url.js';
import { createSession } from './index.js';

describe('Session', () => {
    test('Should be able to create a session', async () => {
        const sessionA = await createSession({
            p: 'mqtt',
            s: 'wss://test.mosquitto.org:8081/mqtt',
        });

        expect(sessionA).toBeDefined();
        console.log(sessionA.getState());

        const handshakeParametersA = sessionA.getHandshakeParameters();

        console.log(handshakeParametersA);

        const encodedUrl = encodeConnectionURL(handshakeParametersA);

        console.log(encodedUrl);

        const decodedUrl = decodeConnectionURL(encodedUrl);

        console.log(decodedUrl);

        expect(decodedUrl).toEqual(handshakeParametersA);

        const sessionB = await createSession(decodedUrl);

        console.log(sessionB.getState());
    });
});
