export type SymmetricKey = {
  // TODO
  toString: () => string;
  encrypt: (message: string) => Promise<string>;
  decrypt: (message: string) => Promise<string>;
};

export const deriveSymmetricKey = async (k: string): Promise<SymmetricKey> => {
  const baseKey = new TextEncoder().encode(k);

  const sharedSecret = await crypto.subtle.importKey(
    "raw",
    baseKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  return {
    toString: () => k,
    encrypt: async (message: string) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedSecret,
        new TextEncoder().encode(message),
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);

      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    },
    decrypt: async (message: string) => {
      const combined = new Uint8Array(
        atob(message)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sharedSecret,
        encrypted,
      );
      const decoder = new TextDecoder();

      return decoder.decode(decrypted);
    },
  };
};

/**
 * Generate a 16-byte random shared key and return as hex
 */
export const generateHandshakeKey = async (): Promise<SymmetricKey> => {
  const array = new Uint8Array(16);

  crypto.getRandomValues(array);

  const keyHex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return await deriveSymmetricKey(keyHex);
};
