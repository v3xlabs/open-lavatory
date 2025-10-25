import { describe, expect, test } from 'vitest';

import { generateHandshakeKey } from './handshake.js';

describe('Handshake', async () => {
    const key = await generateHandshakeKey();

    test('should generate a 16-byte random shared key', () => {
        expect(key).toBeDefined();
        expect(key.toString()).toHaveLength(32);
    });

    test('should encrypt and decrypt a message', async () => {
        const message = 'test';
        const encrypted = await key.encrypt(message);
        const decrypted = await key.decrypt(encrypted);

        expect(decrypted).toBe(message);
    });
});
