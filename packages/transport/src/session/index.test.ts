import { describe, expect, test } from 'vitest';

import { ntfy } from '../signaling/ntfy/index.js';
import { decodeConnectionURL, encodeConnectionURL } from '../utils/url.js';
import { connectSession, createSession } from './index.js';

describe('Session', () => {
    test('Should be able to create a session', async () => {
        const sessionA = await createSession(
            {
                sessionId: 'mytestsession111',
                p: 'ntfy',
                s: 'https://ntfy.sh/',
            },
            ntfy
        );

        expect(sessionA).toBeDefined();
        console.log(sessionA.getState());

        const handshakeParametersA = sessionA.getHandshakeParameters();

        console.log(handshakeParametersA);

        const encodedUrl = encodeConnectionURL(handshakeParametersA);

        console.log(encodedUrl);

        await sessionA.connect();

        const decodedUrl = decodeConnectionURL(encodedUrl);

        console.log(decodedUrl);

        expect(decodedUrl).toEqual(handshakeParametersA);

        const sessionB = await connectSession(encodedUrl);

        console.log(sessionB.getState());
        await sessionB.connect();

        //
    });
});
