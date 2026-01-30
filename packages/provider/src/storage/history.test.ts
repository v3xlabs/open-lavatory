/* eslint-disable sonarjs/no-duplicate-string */
import { describe, expect, it } from "vitest";

import { addToHistory, getHistoryForProtocol } from "./history.js";

describe("addToHistory", () => {
  it("should add URL to empty history", () => {
    const result = addToHistory([], "wss://mqtt-dashboard.com:8884/mqtt");

    expect(result).toEqual(["wss://mqtt-dashboard.com:8884/mqtt"]);
  });

  it("should add URL to front of existing history", () => {
    const history = [
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ];
    const result = addToHistory(history, "ws://test.mosquitto.org:8080/mqtt");

    expect(result).toEqual([
      "ws://test.mosquitto.org:8080/mqtt",
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ]);
  });

  it("should move existing URL to front (deduplication)", () => {
    const history = [
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
      "ws://test.mosquitto.org:8080/mqtt",
    ];
    const result = addToHistory(history, "ws://broker.emqx.io:8083/mqtt");

    expect(result).toEqual([
      "ws://broker.emqx.io:8083/mqtt",
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://test.mosquitto.org:8080/mqtt",
    ]);
  });

  it("should limit to 3 items by default", () => {
    const history = [
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
      "ws://test.mosquitto.org:8080/mqtt",
    ];
    const result = addToHistory(history, "wss://broker.itdata.nu/mqtt");

    expect(result).toEqual([
      "wss://broker.itdata.nu/mqtt",
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ]);
    expect(result).toHaveLength(3);
  });

  it("should respect custom maxItems option", () => {
    const history = [
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ];
    const result = addToHistory(history, "ws://test.mosquitto.org:8080/mqtt", {
      maxItems: 2,
    });

    expect(result).toEqual([
      "ws://test.mosquitto.org:8080/mqtt",
      "wss://mqtt-dashboard.com:8884/mqtt",
    ]);
    expect(result).toHaveLength(2);
  });

  it("should ignore empty strings", () => {
    const history = ["wss://mqtt-dashboard.com:8884/mqtt"];
    const result = addToHistory(history, "");

    expect(result).toEqual(["wss://mqtt-dashboard.com:8884/mqtt"]);
  });

  it("should ignore whitespace-only strings", () => {
    const history = ["wss://mqtt-dashboard.com:8884/mqtt"];
    const result = addToHistory(history, "   ");

    expect(result).toEqual(["wss://mqtt-dashboard.com:8884/mqtt"]);
  });

  it("should trim URLs before adding", () => {
    const history = ["wss://mqtt-dashboard.com:8884/mqtt"];
    const result = addToHistory(history, "  ws://broker.emqx.io:8083/mqtt  ");

    expect(result).toEqual([
      "ws://broker.emqx.io:8083/mqtt",
      "wss://mqtt-dashboard.com:8884/mqtt",
    ]);
  });

  it("should handle URL with trimmed whitespace matching existing URL", () => {
    const history = [
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ];
    const result = addToHistory(
      history,
      "  wss://mqtt-dashboard.com:8884/mqtt  ",
    );

    expect(result).toEqual([
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ]);
  });
});

describe("getHistoryForProtocol", () => {
  it("should return lastUsed for existing protocol", () => {
    const lastUsedObject = {
      mqtt: [
        "wss://mqtt-dashboard.com:8884/mqtt",
        "ws://broker.emqx.io:8083/mqtt",
      ],
      ntfy: ["https://ntfy.sh/"],
      gun: [],
    };
    const result = getHistoryForProtocol(lastUsedObject, "mqtt");

    expect(result).toEqual([
      "wss://mqtt-dashboard.com:8884/mqtt",
      "ws://broker.emqx.io:8083/mqtt",
    ]);
  });

  it("should return empty array for protocol with no lastUsed", () => {
    const lastUsedObject = {
      mqtt: ["wss://mqtt-dashboard.com:8884/mqtt"],
      ntfy: [],
      gun: [],
    };
    const result = getHistoryForProtocol(lastUsedObject, "ntfy");

    expect(result).toEqual([]);
  });

  it("should return empty array for undefined lastUsed object", () => {
    const result = getHistoryForProtocol(undefined, "mqtt");

    expect(result).toEqual([]);
  });

  it("should return empty array for non-existent protocol", () => {
    const lastUsedObject = {
      mqtt: ["wss://mqtt-dashboard.com:8884/mqtt"],
      ntfy: [],
      gun: [],
    };
    const result = getHistoryForProtocol(lastUsedObject, "unknown");

    expect(result).toEqual([]);
  });
});
