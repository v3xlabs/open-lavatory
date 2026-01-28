import { generateKeyPair } from "@openlv/core/encryption";
import { describe, expect, it } from "vitest";

import type { CreateSignalLayerFn, SignalBaseProperties } from "./base.js";
import { gundb } from "./gundb/index.js";
import { mqtt } from "./mqtt/index.js";
import { ntfy } from "./ntfy/index.js";
import { log } from "./utils/log.js";

const hKey = "test";

const providersByType: Record<
  string,
  [CreateSignalLayerFn, SignalBaseProperties][]
> = {
  mqtt: [
    [
      mqtt,
      { topic: "mytesttopic1111", url: "wss://mqtt-dashboard.com:8884/mqtt" },
    ],
    [mqtt, { topic: "mytesttopic1111", url: "ws://broker.emqx.io:8083/mqtt" }],
  ],
  ntfy: [
    [ntfy, { topic: "mytesttopic1111", url: "https://ntfy.sh/" }],
    [ntfy, { topic: "mytesttopic1111", url: "https://ntfy.envs.net/" }],
  ],
  gundb: [[gundb, { topic: "mytesttopic1111", url: "wss://try.axe.eco/gun" }]],
};

async function testSignalingLayer(
  layer: CreateSignalLayerFn,
  props: SignalBaseProperties,
): Promise<void> {
  const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
  const h = hKey;

  const signalingLayer = await layer(props);
  const signalA = await signalingLayer({
    h,
    rpDiscovered: (v) => log("rpKey", v),
    canEncrypt: () => true,
    encrypt: publicKey.encrypt,
    decrypt: decryptionKey.decrypt,
    publicKey,
    isHost: true,
  });
  const signalB = await signalingLayer({
    h,
    rpDiscovered: (v) => log("rpKey", v),
    canEncrypt: () => true,
    encrypt: publicKey.encrypt,
    decrypt: decryptionKey.decrypt,
    publicKey,
    isHost: false,
  });

  expect(signalA).toBeDefined();
  expect(signalB).toBeDefined();

  await Promise.all([signalA.setup(), signalB.setup()]);

  const messageReceivedA = new Promise<void>((resolve) => {
    signalA.on("message", (message) => {
      log("messageReceivedA", message);
      expect(message).toEqual({ data: "test2" });
      resolve();
    });
  });
  const messageReceivedB = new Promise<void>((resolve) => {
    signalB.on("message", (message) => {
      log("messageReceivedB", message);
      expect(message).toEqual({ data: "test1" });
      resolve();
    });
  });

  await signalA.send({ data: "test1" });

  await messageReceivedB;

  await signalB.send({ data: "test2" });

  await messageReceivedA;

  await signalA.teardown();
  await signalB.teardown();
}

const PROVIDER_TIMEOUT_MS = 5_000;

type ProviderResult =
  | { url: string; ok: true }
  | { url: string; ok: false; error: string };

async function testProvider([layer, props]: [
  CreateSignalLayerFn,
  SignalBaseProperties,
]): Promise<ProviderResult> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout after ${PROVIDER_TIMEOUT_MS}ms`)),
      PROVIDER_TIMEOUT_MS,
    ),
  );

  try {
    await Promise.race([testSignalingLayer(layer, props), timeout]);

    return { url: props.url, ok: true };
  } catch (error) {
    return { url: props.url, ok: false, error: (error as Error).message };
  }
}

function formatResults(typeName: string, results: ProviderResult[]): string {
  const passed = results.filter((r) => r.ok).length;

  return [
    `${typeName.toUpperCase()}: ${passed}/${results.length} succeeded`,
    ...results.map((r) => (r.ok ? `  ✓ ${r.url}` : `  ✗ ${r.url}: ${r.error}`)),
  ].join("\n");
}

describe.each(Object.entries(providersByType))(
  "Signaling: %s",
  (typeName, providers) => {
    it(
      "at least one provider works",
      { timeout: PROVIDER_TIMEOUT_MS * providers.length + 5_000 },
      async () => {
        const results = await Promise.all(providers.map(testProvider));
        const summary = formatResults(typeName, results);

        console.log(`\n${summary}`);

        expect(
          results.some((r) => r.ok),
          summary,
        ).toBe(true);
      },
    );
  },
);
