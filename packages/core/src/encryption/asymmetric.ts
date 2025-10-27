import nacl from "tweetnacl";

import type { SessionParameters } from "../session.js";
import { fromBase64, toBase64 } from "./base64.js";

const PUBLIC_KEY_BYTE_LENGTH = nacl.box.publicKeyLength;
const NONCE_BYTE_LENGTH = nacl.box.nonceLength;

const composePayload = (
  ephemeralPublicKey: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): string => {
  const payload = new Uint8Array(
    ephemeralPublicKey.length + nonce.length + ciphertext.length,
  );

  payload.set(ephemeralPublicKey, 0);
  payload.set(nonce, ephemeralPublicKey.length);
  payload.set(ciphertext, ephemeralPublicKey.length + nonce.length);

  return toBase64(payload);
};

const decomposePayload = (
  payload: string,
): {
  ephemeralPublicKey: Uint8Array;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
} => {
  const bytes = new Uint8Array(
    atob(payload)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  if (bytes.length <= PUBLIC_KEY_BYTE_LENGTH + NONCE_BYTE_LENGTH) {
    throw new Error("Encrypted payload is malformed.");
  }

  const ephemeralPublicKey = bytes.slice(0, PUBLIC_KEY_BYTE_LENGTH);
  const nonce = bytes.slice(
    PUBLIC_KEY_BYTE_LENGTH,
    PUBLIC_KEY_BYTE_LENGTH + NONCE_BYTE_LENGTH,
  );
  const ciphertext = bytes.slice(PUBLIC_KEY_BYTE_LENGTH + NONCE_BYTE_LENGTH);

  return {
    ephemeralPublicKey,
    nonce,
    ciphertext,
  };
};

export type EncryptionKey = {
  toString: () => string;
  encrypt: (message: string) => Promise<string>;
};

export type DecryptionKey = {
  toString: () => string;
  decrypt: (message: string) => Promise<string>;
};

export const createEncryptionKey = async (
  key: Uint8Array,
): Promise<EncryptionKey> => {
  const serializedPublicKey = toBase64(key);

  return {
    toString: () => serializedPublicKey,
    encrypt: async (message: string) => {
      const messageBytes = new TextEncoder().encode(message);
      const ephemeralKeyPair = nacl.box.keyPair();
      const nonce = nacl.randomBytes(NONCE_BYTE_LENGTH);
      const ciphertext = nacl.box(
        messageBytes,
        nonce,
        key,
        ephemeralKeyPair.secretKey,
      );

      if (!ciphertext) {
        throw new Error("Failed to encrypt message.");
      }

      return composePayload(ephemeralKeyPair.publicKey, nonce, ciphertext);
    },
  };
};

export const parseEncryptionKey = async (
  serializedKey: string,
): Promise<EncryptionKey> => {
  const decodedPublicKey = fromBase64(serializedKey);

  return createEncryptionKey(decodedPublicKey);
};

export const createDecryptionKey = async (
  key: Uint8Array,
): Promise<DecryptionKey> => {
  const serializedSecretKey = toBase64(key);

  return {
    toString: () => serializedSecretKey,
    decrypt: async (message: string) => {
      if (!message) {
        return "";
      }

      const { ephemeralPublicKey, nonce, ciphertext } =
        decomposePayload(message);
      const decrypted = nacl.box.open(
        ciphertext,
        nonce,
        ephemeralPublicKey,
        key,
      );

      if (!decrypted) {
        throw new Error("Failed to decrypt message.");
      }

      return new TextDecoder().decode(decrypted);
    },
  };
};

export type EncKeypair = {
  encryptionKey: EncryptionKey;
  decryptionKey: DecryptionKey;
};

export const generateKeyPair = async (): Promise<EncKeypair> => {
  const { publicKey, secretKey } = nacl.box.keyPair();
  const encryptionKey = await createEncryptionKey(publicKey);
  const decryptionKey = await createDecryptionKey(secretKey);

  return { encryptionKey, decryptionKey };
};

export const initEncryptionKeys = async (
  initParameters?: SessionParameters,
) => {
  const keyPair = nacl.box.keyPair();
  const { encryptionKey, decryptionKey } = await generateKeyPair();

  if (
    initParameters &&
    "publicKey" in initParameters &&
    initParameters.publicKey
  ) {
    const relyingEncryptionKey = await parseEncryptionKey(
      initParameters.publicKey as string,
    );

    return {
      encryptionKey,
      decryptionKey,
      relyingEncryptionKey,
    };
  }

  return {
    encryptionKey,
    decryptionKey,
    relyingEncryptionKey: await createEncryptionKey(keyPair.publicKey),
  };
};
