import { generateKeyPair } from "@openlv/core/encryption";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it } from "vitest";

import {
  createTransportBase,
  TRANSPORT_STATE,
  type TransportLayer,
  type TransportLayerBaseEmitter,
  type TransportLayerSetupParameters,
} from "./index.js";
import { webrtc } from "./webrtc/index.js";

describe("Transport", () => {
  it("should be able to create a transport", async () => {
    const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
    const { encrypt } = publicKey;
    const { decrypt } = decryptionKey;
    const signalA = new EventEmitter<{ signal: string; message: object; }>();
    const signalB = new EventEmitter<{ signal: string; message: object; }>();

    const transportA = webrtc()({
      encrypt,
      decrypt,
      subsend: async (m) => {
        signalA.emit("signal", m);
      },
      isHost: true,
      onmessage: (m) => {
        signalA.emit("message", m);
      },
    });
    const transportB = webrtc()({
      encrypt,
      decrypt,
      subsend: async (m) => {
        signalB.emit("signal", m);
      },
      isHost: false,
      onmessage: (m) => {
        signalB.emit("message", m);
      },
    });

    signalA.on("signal", (m) => {
      console.log("messageA", m);
      transportB.handle(m);
    });
    signalB.on("signal", (m) => {
      console.log("messageB", m);
      transportA.handle(m);
    });

    console.log("test: setup");
    await Promise.all([transportA.setup(), transportB.setup()]);

    console.log("test: waitFor connected");
    await Promise.all([
      transportA.waitFor(TRANSPORT_STATE.CONNECTED),
      transportB.waitFor(TRANSPORT_STATE.CONNECTED),
    ]);

    console.log("test: connected");

    const awaitedMessageAtB = new Promise<object>((resolve) => {
      signalB.on("message", (m) => {
        console.log("messageB", m);
        resolve(m);
      });
    });

    console.log("test: send message to A");
    await transportA.send({ data: "test_123" });

    console.log("test: await message at B");
    const messageAtB = await awaitedMessageAtB;

    expect(messageAtB).toEqual({ data: "test_123" });

    console.log("test: message at B", messageAtB);
    const awaitedMessageAtA = new Promise<object>((resolve) => {
      signalA.on("message", (m) => {
        console.log("messageA", m);
        resolve(m);
      });
    });

    await transportB.send({ data: "test_456" });
    const messageAtA = await awaitedMessageAtA;

    expect(messageAtA).toEqual({ data: "test_456" });

    await Promise.all([transportA.teardown(), transportB.teardown()]);

    expect(transportA).toBeDefined();
    expect(transportB).toBeDefined();
  });

  it("waits for an encrypted probe roundtrip before becoming connected", async () => {
    const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
    const messagesA: object[] = [];
    const messagesB: object[] = [];
    const harnessA = createMemoryTransportHarness({ probeInterval: 20 });
    const harnessB = createMemoryTransportHarness({ probeInterval: 20 });

    harnessA.peer = harnessB;
    harnessB.peer = harnessA;

    const transportA = harnessA.create({
      encrypt: publicKey.encrypt,
      decrypt: decryptionKey.decrypt,
      subsend: async () => {},
      isHost: true,
      onmessage: m => messagesA.push(m),
    });
    const transportB = harnessB.create({
      encrypt: publicKey.encrypt,
      decrypt: decryptionKey.decrypt,
      subsend: async () => {},
      isHost: false,
      onmessage: m => messagesB.push(m),
    });

    await Promise.all([transportA.setup(), transportB.setup()]);

    harnessA.ready();
    await expect(Promise.race([
      transportA.waitFor(TRANSPORT_STATE.CONNECTED).then(() => "connected"),
      new Promise(resolve => setTimeout(resolve, 100)).then(() => "timeout"),
    ])).resolves.toBe("timeout");

    harnessB.ready();
    await Promise.all([
      transportA.waitFor(TRANSPORT_STATE.CONNECTED),
      transportB.waitFor(TRANSPORT_STATE.CONNECTED),
    ]);

    expect(messagesA).toEqual([]);
    expect(messagesB).toEqual([]);
  });

  it("allows close messages once ready before liveness marks connected", async () => {
    const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
    const messagesB: object[] = [];
    const harnessA = createMemoryTransportHarness({ probeInterval: 10_000 });
    const harnessB = createMemoryTransportHarness({ probeInterval: 10_000 });

    harnessA.peer = harnessB;
    harnessB.peer = harnessA;

    const parameters: TransportLayerSetupParameters = {
      encrypt: publicKey.encrypt,
      decrypt: decryptionKey.decrypt,
      subsend: async () => {},
      isHost: true,
      onmessage: () => {},
    };
    const transportA = harnessA.create(parameters);
    const transportB = harnessB.create({
      ...parameters,
      isHost: false,
      onmessage: m => messagesB.push(m),
    });

    await Promise.all([transportA.setup(), transportB.setup()]);
    harnessA.ready();
    harnessB.acceptInbound = true;

    await expect(transportA.send(
      {
        type: "close",
        messageId: "close-1",
      },
      { allowReady: true },
    )).resolves.toBeUndefined();
    await expect(transportA.send({
      type: "request",
      messageId: "request-1",
      payload: { data: "test" },
    })).rejects.toThrow("Transport not connected");
    expect(messagesB).toEqual([{ type: "close", messageId: "close-1" }]);
  });

  it("moves to error when encrypted heartbeat responses stop", async () => {
    const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
    const harnessA = createMemoryTransportHarness({
      probeInterval: 10,
      heartbeatInterval: 20,
      heartbeatTimeout: 50,
    });
    const harnessB = createMemoryTransportHarness({
      probeInterval: 10,
      heartbeatInterval: 20,
      heartbeatTimeout: 50,
    });

    harnessA.peer = harnessB;
    harnessB.peer = harnessA;

    const parameters: TransportLayerSetupParameters = {
      encrypt: publicKey.encrypt,
      decrypt: decryptionKey.decrypt,
      subsend: async () => {},
      isHost: true,
      onmessage: () => {},
    };
    const transportA = harnessA.create(parameters);
    const transportB = harnessB.create({ ...parameters, isHost: false });

    await Promise.all([transportA.setup(), transportB.setup()]);
    harnessA.ready();
    harnessB.ready();
    await Promise.all([
      transportA.waitFor(TRANSPORT_STATE.CONNECTED),
      transportB.waitFor(TRANSPORT_STATE.CONNECTED),
    ]);

    harnessB.acceptInbound = false;

    await transportA.waitFor(TRANSPORT_STATE.ERROR);
  });

  it("rejects waitFor when the transport reaches a terminal state first", async () => {
    const { encryptionKey: publicKey, decryptionKey } = await generateKeyPair();
    const harness = createMemoryTransportHarness({ probeInterval: 10 });

    const transport = harness.create({
      encrypt: publicKey.encrypt,
      decrypt: decryptionKey.decrypt,
      subsend: async () => {},
      isHost: true,
      onmessage: () => {},
    });

    await transport.setup();
    const wait = transport.waitFor(TRANSPORT_STATE.CONNECTED);

    await transport.teardown();

    await expect(wait).rejects.toThrow("Transport reached terminal state: disconnected");
  });
});

type MemoryTransportHarness = {
  acceptInbound: boolean;
  peer?: MemoryTransportHarness;
  create: (parameters: TransportLayerSetupParameters) => TransportLayer;
  ready: () => void;
  receive: (message: string) => void;
};

const createMemoryTransportHarness = (
  livenessConfig: Parameters<typeof createTransportBase>[1] = {},
): MemoryTransportHarness => {
  let emitter: TransportLayerBaseEmitter;

  const harness: MemoryTransportHarness = {
    acceptInbound: false,
    create(parameters) {
      return createTransportBase(({ emitter: internalEmitter }) => {
        emitter = internalEmitter;

        return {
          type: "memory",
          setup: () => {},
          teardown: () => {
            internalEmitter.emit("close");
          },
          handle: async () => {},
          send: async (message) => {
            harness.peer?.receive(message);
          },
        };
      }, livenessConfig)(parameters);
    },
    ready() {
      harness.acceptInbound = true;
      emitter.emit("ready");
    },
    receive(message) {
      if (!harness.acceptInbound) return;

      emitter.emit("message", message);
    },
  };

  return harness;
};
