import { SessionParameters } from '../session/index.js';

/**
 * WARNING, this is a potentially unsafe implementation of RSA-OAEP encryption.
 * As it repeats chunked encryption.
 *
 * This is to be replaced in the future with a more secure implementation.
 * The reason is RSA-OAEP (as provided by the browser) does not allow signing messages below its key size.
 */

const BASE64_DELIMITER = '.';
const SHA256_HASH_BYTE_LENGTH = 32;

const toBase64 = (data: Uint8Array): string => {
    let binary = '';

    for (let index = 0; index < data.length; index += 1) {
        binary += String.fromCharCode(data[index]);
    }

    return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
};

const normalizeBase64UrlPadding = (value: string): string => {
    const paddingRemainder = value.length % 4;

    if (paddingRemainder === 0) {
        return value;
    }

    return `${value}${'='.repeat(4 - paddingRemainder)}`;
};

const fromBase64Url = (value: string): Uint8Array => {
    const normalized = normalizeBase64UrlPadding(value).replace(/-/g, '+').replace(/_/g, '/');

    return fromBase64(normalized);
};

const getMaxRsaOaepChunkSize = (exportedKey: JsonWebKey): number => {
    if (!exportedKey.n) {
        throw new Error('Missing modulus information for RSA key.');
    }

    const modulusBytes = fromBase64Url(exportedKey.n);
    const chunkSize = modulusBytes.length - 2 * SHA256_HASH_BYTE_LENGTH - 2;

    if (chunkSize <= 0) {
        throw new Error('Unsupported RSA key length for OAEP chunking.');
    }

    return chunkSize;
};

export type EncryptionKey = {
    toString: () => string;
    encrypt: (message: string) => Promise<string>;
};
export type DecryptionKey = {
    toString: () => string;
    decrypt: (message: string) => Promise<string>;
};

export const createEncryptionKey = async (key: CryptoKey): Promise<EncryptionKey> => {
    const exportKey = await crypto.subtle.exportKey('jwk', key);
    const encodedKey = JSON.stringify(exportKey);
    const maxChunkSize = getMaxRsaOaepChunkSize(exportKey);

    return {
        toString: () => encodedKey,
        encrypt: async (message: string) => {
            const data = new TextEncoder().encode(message);
            const chunks: string[] = [];

            const encryptChunk = async (chunk: Uint8Array): Promise<void> => {
                const encryptedBuffer = await crypto.subtle.encrypt(
                    { name: 'RSA-OAEP' },
                    key,
                    Buffer.from(chunk)
                );

                chunks.push(toBase64(new Uint8Array(encryptedBuffer)));
            };

            if (data.length === 0) {
                await encryptChunk(new Uint8Array(0));
            } else {
                for (let offset = 0; offset < data.length; offset += maxChunkSize) {
                    const chunk = data.subarray(
                        offset,
                        Math.min(offset + maxChunkSize, data.length)
                    );

                    await encryptChunk(chunk);
                }
            }

            return chunks.join(BASE64_DELIMITER);
        },
    };
};

export const parseEncryptionKey = async (key: string): Promise<EncryptionKey> => {
    const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(key),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
    );

    return createEncryptionKey(cryptoKey);
};

export const createDecryptionKey = async (key: CryptoKey): Promise<DecryptionKey> => {
    const exportKey = await crypto.subtle.exportKey('jwk', key);
    const encodedKey = JSON.stringify(exportKey);

    return {
        toString: () => encodedKey,
        decrypt: async (message: string) => {
            if (!message) {
                return '';
            }

            const encryptedChunks = message.split(BASE64_DELIMITER);
            const decryptedChunks: Uint8Array[] = [];

            for (const chunk of encryptedChunks) {
                if (!chunk) {
                    continue;
                }

                const encryptedBytes = fromBase64(chunk);
                const decryptedBuffer = await crypto.subtle.decrypt(
                    { name: 'RSA-OAEP' },
                    key,
                    Buffer.from(encryptedBytes)
                );

                decryptedChunks.push(new Uint8Array(decryptedBuffer));
            }

            if (decryptedChunks.length === 0) {
                return '';
            }

            const totalLength = decryptedChunks.reduce((length, part) => length + part.length, 0);
            const combined = new Uint8Array(totalLength);

            for (let index = 0, offset = 0; index < decryptedChunks.length; index += 1) {
                const part = decryptedChunks[index];

                combined.set(part, offset);
                offset += part.length;
            }

            return new TextDecoder().decode(combined);
        },
    };
};

export type EncKeypair = { encryptionKey: EncryptionKey; decryptionKey: DecryptionKey };

export const generateKeyPair = async (): Promise<EncKeypair> => {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );

    const encryptionKey = await createEncryptionKey(publicKey);
    const decryptionKey = await createDecryptionKey(privateKey);

    return { encryptionKey, decryptionKey };
};

export const initEncryptionKeys = async (initParameters?: SessionParameters) => {
    // if initParameters contains encryptionKey and decryptionKey, verify them and return them
    // TODO: import & verify keys from connection parameters

    // otherwise generate a new keypair
    const { encryptionKey, decryptionKey } = await generateKeyPair();

    return {
        encryptionKey,
        decryptionKey,
    };
};
