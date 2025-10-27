import { describe, expect, test } from "vitest";

import { decodeConnectionURL, encodeConnectionURL } from "./url.js";

const testCases = [
  {
    url: "openlv://k7n8m9x2w5q1p3r6?h=a1b2c3d4e5f60708&k=0123456789abcdef0123456789abcdef&p=mqtt&s=wss%3A%2F%2Ftest.mosquitto.org%3A8081%2Fmqtt",
    expected: {
      sessionId: "k7n8m9x2w5q1p3r6",
      h: "a1b2c3d4e5f60708",
      k: "0123456789abcdef0123456789abcdef",
      p: "mqtt",
      s: "wss://test.mosquitto.org:8081/mqtt",
    },
  },
];

describe("URL Utilities", () => {
  test("should decode connection URL", () => {
    testCases.forEach((testCase) => {
      const result = decodeConnectionURL(testCase.url);

      expect(result).toEqual(testCase.expected);
    });
  });

  test("should encode connection URL", () => {
    testCases.forEach((testCase) => {
      const result = encodeConnectionURL(testCase.expected);

      expect(result).toEqual(testCase.url);
    });
  });
});
