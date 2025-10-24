import { SessionParameters } from '../session/index.js';

export type EncryptionKey = string;
export type DecryptionKey = string;

export type EncKeypair = { encryptionKey: EncryptionKey; decryptionKey: DecryptionKey };

export const generateKeyPair = async (): Promise<EncKeypair> => {
    return { encryptionKey: '', decryptionKey: '' };
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

export const encryptMessage = (message: string, publicKey: EncryptionKey) => {
    //
    return '';
};

export const decryptMessage = (message: string, privateKey: DecryptionKey) => {
    //
    return '';
};
