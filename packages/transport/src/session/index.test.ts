import { describe, expect, test } from 'vitest';

import { decodeConnectionURL, encodeConnectionURL } from '../utils/url.js';
import { createSession } from './index.js';

describe('Session', () => {
    test('Should be able to create a session', async () => {
        const sessionA = await createSession({
            sessionId: 'mytestsession111',
            p: 'ntfy',
            s: 'https://ntfy.sh/',
        });

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

        const sessionB = await createSession(decodedUrl);

        console.log(sessionB.getState());
        await sessionB.connect();

        //
    });
});
