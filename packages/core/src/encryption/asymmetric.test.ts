import { describe, expect, test } from "vitest";

import { generateKeyPair, parseEncryptionKey } from "./asymmetric.js";

describe("Asymmetric encryption", () => {
  test("should generate a key pair", async () => {
    const keyPair = await generateKeyPair();

    expect(keyPair).toBeDefined();
    expect(keyPair.encryptionKey).toBeDefined();
    expect(keyPair.decryptionKey).toBeDefined();
  });

  test("should encrypt and decrypt a message", async () => {
    const { encryptionKey, decryptionKey } = await generateKeyPair();
    const message = "test";

    // regular encryption decryption
    const encrypted = await encryptionKey.encrypt(message);
    const decrypted = await decryptionKey.decrypt(encrypted);

    expect(decrypted).toBe(message);
  });

  test("should encrypt and decrypt a message with a parsed key", async () => {
    const { encryptionKey, decryptionKey } = await generateKeyPair();
    const message = "test";

    const key = encryptionKey.toString();
    const parsedKey = await parseEncryptionKey(key);
    const parsedEncrypted = await parsedKey.encrypt(message);

    console.log("parsedEncrypted", parsedEncrypted);
    const decodedParsedEncrypted = await decryptionKey.decrypt(parsedEncrypted);

    console.log("decodedParsedEncrypted", decodedParsedEncrypted);

    expect(decodedParsedEncrypted).toBe(message);
  });

  test("should be able to encrypt large blob", async () => {
    const { encryptionKey, decryptionKey } = await generateKeyPair();
    const message = Array.from({ length: 1024 * 1024 }).fill("a")
      .join("");

    console.log("message", message.length);

    const encrypted = await encryptionKey.encrypt(message);
    const decrypted = await decryptionKey.decrypt(encrypted);

    expect(decrypted).toBe(message);
  });
});
