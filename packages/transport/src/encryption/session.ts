/**
 * URL-safe alphabet for session ID generation
 */
const URL_SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Generate a cryptographically secure URL-safe random string
 */
const generateUrlSafeRandomString = (length: number): string => {
    const array = new Uint8Array(length);

    crypto.getRandomValues(array);

    return Array.from(array)
        .map((byte) => URL_SAFE_ALPHABET[byte % URL_SAFE_ALPHABET.length])
        .join('');
};

/**
 * Generate a 16-character URL-safe session ID
 */
export const generateSessionId = (): string => {
    return generateUrlSafeRandomString(16);
};
