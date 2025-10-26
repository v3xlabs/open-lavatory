import { describe, expect, test } from "vitest";

import { fromBase64, toBase64 } from "./base64.js";

describe("Base64", () => {
  test("should convert Uint8Array to base64", () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const base64 = toBase64(data);

    expect(base64).toBe("AAECAw==");
  });

  test("should convert base64 to Uint8Array", () => {
    const base64 = "AAECAw==";
    const data = fromBase64(base64);

    expect(data).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0x03]));
  });

  test("should be transparent", () => {
    const input = [1, 2, 3, 4];
    const base64 = toBase64(new Uint8Array(input));
    const data = fromBase64(base64);

    expect(data).toEqual(new Uint8Array(input));
  });
});
