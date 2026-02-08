/* eslint-disable sonarjs/no-duplicate-string */
import { describe, expect, test } from "vitest";

import {
  convertProviderStorageV0ToV1,
  convertProviderStorageV1ToV2,
  convertProviderStorageV2ToV3,
  migrateStorageToLatest,
  type ProviderStorageV0,
  type ProviderStorageV1,
  type ProviderStorageV2,
  type ProviderStorageV3,
  type ProviderStorageVAny,
} from "./version.js";

const testCases = {
  v0tov1: [
    {
      name: "basic",
      input: {
        autoReconnect: false,
        retainHistory: false,
        session: {
          p: "mqtt",
          s: "wss://test.mosquitto.org:8081/mqtt",
        },
      },
      output: {
        version: 1,
        autoReconnect: false,
        retainHistory: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
          },
        },
      },
    },
  ] as { name: string; input: ProviderStorageV0; output: ProviderStorageV1 }[],
  v1tov2: [
    {
      name: "basic",
      input: {
        version: 1,
        retainHistory: false,
        autoReconnect: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
          },
        },
      },
      output: {
        version: 2,
        autoReconnect: false,
        retainHistory: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
          },
        },
      },
    },
  ] as { name: string; input: ProviderStorageV1; output: ProviderStorageV2 }[],
  v2tov3: [
    {
      name: "basic - initializes empty history mapping for recently used tracking",
      input: {
        version: 2,
        retainHistory: false,
        autoReconnect: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
            ntfy: "https://ntfy.sh",
            gun: "wss://try.axe.eco/gun",
          },
        },
        language: undefined,
      },
      output: {
        version: 3,
        autoReconnect: false,
        retainHistory: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
            ntfy: "https://ntfy.sh",
            gun: "wss://try.axe.eco/gun",
          },
          h: {
            mqtt: [],
          },
        },
        language: undefined,
        transport: undefined,
        theme: undefined,
      },
    },
  ] as { name: string; input: ProviderStorageV2; output: ProviderStorageV3 }[],
  startToFinish: [
    {
      name: "v0->v1->v2->v3",
      input: {
        version: 0,
        autoReconnect: false,
        retainHistory: false,
        session: {
          p: "mqtt",
          s: "wss://test.mosquitto.org:8081/mqtt",
        },
      },
      output: {
        version: 3,
        autoReconnect: false,
        retainHistory: false,
        signaling: {
          p: "mqtt",
          s: {
            mqtt: "wss://test.mosquitto.org:8081/mqtt",
          },
          h: {
            mqtt: [],
          },
        },
        language: undefined,
        transport: undefined,
        theme: undefined,
      },
    },
  ] as {
    name: string;
    input: ProviderStorageVAny;
    output: ProviderStorageVAny;
  }[],
} as const;

describe("Storage Migrations", () => {
  for (const testCase of testCases.v0tov1) {
    test(`v0 to v1: ${testCase.name}`, () => {
      const result = convertProviderStorageV0ToV1(testCase.input);

      expect(result).toEqual(testCase.output);
    });
  }

  for (const testCase of testCases.v1tov2) {
    test(`v1 to v2: ${testCase.name}`, () => {
      const result = convertProviderStorageV1ToV2(testCase.input);

      expect(result).toEqual(testCase.output);
    });
  }

  for (const testCase of testCases.v2tov3) {
    test(`v2 to v3: ${testCase.name}`, () => {
      const result = convertProviderStorageV2ToV3(testCase.input);

      expect(result).toEqual(testCase.output);
    });
  }

  for (const testCase of testCases.startToFinish) {
    test(`start to finish: ${testCase.name}`, () => {
      const result = migrateStorageToLatest(
        testCase.input as unknown as ProviderStorageVAny,
      );

      expect(result).toEqual(testCase.output);
    });
  }
});
