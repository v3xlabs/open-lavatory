import { describe, expect, test } from "vitest";

import { deriveSymmetricKey, generateHandshakeKey } from "./handshake.js";

describe("Handshake", async () => {
  const key = await generateHandshakeKey();

  test("should generate a 16-byte random shared key", () => {
    expect(key).toBeDefined();
    expect(key.toString()).toHaveLength(32);
  });

  test("should encrypt and decrypt a message", async () => {
    const message = "test";
    const encrypted = await key.encrypt(message);
    const decrypted = await key.decrypt(encrypted);

    expect(decrypted).toBe(message);
  });

  test("should derive symmetric key from decoded hex bytes", async () => {
    const key = await deriveSymmetricKey("000102030405060708090a0b0c0d0e0f");
    const encrypted = await key.encrypt("hello");
    const rederived = await deriveSymmetricKey("000102030405060708090a0b0c0d0e0f");

    await expect(rederived.decrypt(encrypted)).resolves.toBe("hello");
  });
});
