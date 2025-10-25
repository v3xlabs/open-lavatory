import { EncryptionKey } from './index.js';

const HASH_LENGTH = 16;

/**
 * Hashes a public key using SHA-256 and returns the first 16 bytes as a hex string
 */
export const hashPublicKey = async (publicKey: EncryptionKey): Promise<string> => {
    const buffer = new TextEncoder().encode(publicKey);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = new Uint8Array(hash);
    const hashHex = Array.from(hashArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return hashHex.slice(0, HASH_LENGTH);
};

export const validatePublicKeyHash = async (
    publicKey: EncryptionKey,
    hash: string
): Promise<boolean> => {
    const computedHash = await hashPublicKey(publicKey);

    return computedHash === hash;
};

/**
 * determines/or generates the hash and dictates wether is host or not
 */
export const initHash = async (initialHash: string | undefined, encryptionKey: EncryptionKey) => {
    const ourHash = await hashPublicKey(encryptionKey);

    const hash = initialHash ?? ourHash;
    const isHost = initialHash ? initialHash === ourHash : false;

    return {
        hash,
        isHost,
    };
};
