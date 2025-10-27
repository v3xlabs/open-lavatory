/**
 * Encryption utilities for Open Lavatory Protocol
 * Implements ECDH key exchange with P-256 curve and ECIES encryption
 */
/** biome-ignore-all lint/suspicious/noConsole: temp */
/** biome-ignore-all lint/complexity/noStaticOnlyClass: temp */

export class EncryptionUtils {
  /**
   * URL-safe alphabet for session ID generation
   */
  private static readonly URL_SAFE_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  /**
   * Generate a cryptographically secure URL-safe random string
   */
  static generateUrlSafeRandomString(length: number): string {
    const array = new Uint8Array(length);

    crypto.getRandomValues(array);

    return Array.from(array)
      .map(
        (byte) => EncryptionUtils.URL_SAFE_ALPHABET[byte % EncryptionUtils.URL_SAFE_ALPHABET.length],
      )
      .join("");
  }

  /**
   * Generate a 16-character URL-safe session ID
   */
  static generateSessionId(): string {
    return EncryptionUtils.generateUrlSafeRandomString(16);
  }

  /**
   * Generate a 32-byte random shared key and return as hex
   */
  static generateSharedKey(): string {
    const array = new Uint8Array(32);

    crypto.getRandomValues(array);

    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Convert hex string to Uint8Array
   */
  static hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have even length");
    }

    const array = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
      array[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return array;
  }

  /**
   * Convert Uint8Array to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Generate an ECDH keypair using P-256 curve
   */
  static async generateKeyPair(): Promise<{
    privateKey: CryptoKey;
    publicKey: CryptoKey;
  }> {
    return await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey"],
    );
  }

  /**
   * Export public key to raw format (65 bytes uncompressed)
   */
  static async exportPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.exportKey("raw", publicKey);
  }

  /**
   * Import public key from raw format
   */
  static async importPublicKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
      [],
    );
  }

  /**
   * Compute SHA-256 hash of public key and return first 8 bytes as hex
   */
  static async computePublicKeyHash(publicKey: CryptoKey): Promise<string> {
    const exportedKey = await EncryptionUtils.exportPublicKey(publicKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", exportedKey);
    const hashArray = new Uint8Array(hashBuffer);
    const shortHash = hashArray.slice(0, 8); // First 8 bytes

    return Array.from(shortHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Compute SHA-256 hash of raw public key data
   */
  static async computePublicKeyHashFromRaw(
    publicKeyData: Uint8Array,
  ): Promise<string> {
    // @ts-expect-error
    const hashBuffer = await crypto.subtle.digest("SHA-256", publicKeyData);
    const hashArray = new Uint8Array(hashBuffer);
    const shortHash = hashArray.slice(0, 8); // First 8 bytes

    return Array.from(shortHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Derive shared AES-GCM key from ECDH key exchange
   */
  static async deriveSharedKey(
    privateKey: CryptoKey,
    peerPublicKey: CryptoKey,
  ): Promise<CryptoKey> {
    const sharedSecret = await crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: peerPublicKey,
      },
      privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"],
    );

    return sharedSecret;
  }

  /**
   * Encrypt message using ECIES scheme
   * Format: ephemeral_pubkey || iv || encrypted_data || auth_tag
   */
  static async encryptMessage(
    message: any,
    recipientPublicKey: CryptoKey,
    senderPrivateKey: CryptoKey,
    senderPublicKey: CryptoKey,
  ): Promise<string> {
    const sharedKey = await EncryptionUtils.deriveSharedKey(
      senderPrivateKey,
      recipientPublicKey,
    );
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      data,
    );

    // Get ephemeral public key for ECIES
    const ephemeralPublicKey = await EncryptionUtils.exportPublicKey(senderPublicKey);

    // Combine ephemeral public key, IV and encrypted data
    const combined = new Uint8Array(
      ephemeralPublicKey.byteLength + iv.length + encrypted.byteLength,
    );

    combined.set(new Uint8Array(ephemeralPublicKey));
    combined.set(iv, ephemeralPublicKey.byteLength);
    combined.set(
      new Uint8Array(encrypted),
      ephemeralPublicKey.byteLength + iv.length,
    );

    // Return as base64
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  }

  /**
   * Decrypt message using ECIES scheme
   */
  static async decryptMessage(
    encryptedMessage: string,
    recipientPrivateKey: CryptoKey,
  ): Promise<any> {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedMessage)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // Extract ephemeral public key, IV and encrypted data
      const ephemeralPublicKey = combined.slice(0, 65); // P-256 uncompressed key is 65 bytes
      const iv = combined.slice(65, 77); // 12 bytes
      const encrypted = combined.slice(77);

      // Import ephemeral public key
      const senderPublicKey = await EncryptionUtils.importPublicKey(
        ephemeralPublicKey.buffer,
      );

      // Derive shared key
      const sharedKey = await EncryptionUtils.deriveSharedKey(
        recipientPrivateKey,
        senderPublicKey,
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encrypted,
      );

      const decoder = new TextDecoder();
      const messageStr = decoder.decode(decrypted);

      return JSON.parse(messageStr);
    } catch (error) {
      console.error("Failed to decrypt message:", error);
      throw new Error("Message decryption failed");
    }
  }

  /**
   * Convert public key to base64 string for transmission
   */
  static async publicKeyToBase64(publicKey: CryptoKey): Promise<string> {
    const exportedKey = await EncryptionUtils.exportPublicKey(publicKey);

    return btoa(
      String.fromCharCode.apply(null, Array.from(new Uint8Array(exportedKey))),
    );
  }

  /**
   * Convert base64 string back to public key
   */
  static async publicKeyFromBase64(base64Key: string): Promise<CryptoKey> {
    const keyData = new Uint8Array(
      atob(base64Key)
        .split("")
        .map((char) => char.charCodeAt(0)),
    );

    return await EncryptionUtils.importPublicKey(keyData.buffer);
  }

  /**
   * Derive symmetric key from hex-encoded shared secret (for initial handshake)
   */
  static async deriveSymmetricKey(sharedSecretHex: string): Promise<CryptoKey> {
    const sharedSecretBytes = EncryptionUtils.hexToBytes(sharedSecretHex);
    // @ts-expect-error
    const sharedSecretBytesBufferSource: BufferSource = sharedSecretBytes;
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      sharedSecretBytesBufferSource,
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    const encoder = new TextEncoder();

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("openlv-salt"), // Fixed salt for deterministic key
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /**
   * Encrypt message using symmetric key (for initial handshake)
   */
  static async encryptSymmetric(
    message: any,
    sharedKey: CryptoKey,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);

    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  }

  /**
   * Decrypt message using symmetric key (for initial handshake)
   */
  static async decryptSymmetric(
    encryptedMessage: string,
    sharedKey: CryptoKey,
  ): Promise<any> {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedMessage)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12); // 12 bytes
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encrypted,
      );

      const decoder = new TextDecoder();
      const messageStr = decoder.decode(decrypted);

      return JSON.parse(messageStr);
    } catch (error) {
      console.error("Failed to decrypt symmetric message:", error);
      throw new Error("Symmetric message decryption failed");
    }
  }
}
