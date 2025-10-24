export type SymmetricKey = {
    // TODO
    toString: () => string;
};

export const deriveSymmetricKey = async (k: string): Promise<SymmetricKey> => {
    //

    return {
        toString: () => k,
    };
};

export const encryptHandshake = async (message: string, k: SymmetricKey): Promise<string> => {
    //

    return message;
};

export const decryptHandshake = async (message: string, k: SymmetricKey): Promise<string> => {
    //

    return message;
};

/**
 * Generate a 16-byte random shared key and return as hex
 */
export const generateHandshakeKey = (): SymmetricKey => {
    const array = new Uint8Array(16);

    crypto.getRandomValues(array);

    const keyHex = Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return {
        toString: () => keyHex,
    };
};
