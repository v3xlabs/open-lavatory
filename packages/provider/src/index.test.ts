import { observable } from "@openlv/core";
import type { EncryptionKey } from "@openlv/core/encryption";
import {
  createSession,
  type Session,
  SessionStatus,
} from "@openlv/session";
import {
  type PeerCapabilities,
  type SignalingLayer,
  Status as SignalStatus,
} from "@openlv/signaling";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it, vi } from "vitest";

import { createProvider, ProviderStatus } from "./index.js";

vi.mock("@openlv/session", async importOriginal => ({
  ...await importOriginal<typeof import("@openlv/session")>(),
  createSession: vi.fn(),
}));

describe("createProvider", () => {
  it("returns to standby when an in-progress connection is cancelled", async () => {
    const [status, setStatus] = observable<SessionStatus>(SessionStatus.CREATED);
    const [error] = observable<string | undefined>(undefined);
    const [signalStatus] = observable(SignalStatus.STANDBY);
    const [peerInfo] = observable(undefined);
    const [peerKey] = observable<EncryptionKey | undefined>(undefined);
    const [peerCapabilities] = observable<PeerCapabilities | undefined>(undefined);
    const close = vi.fn(async () => {
      setStatus(SessionStatus.DISCONNECTED);
    });
    const signal: SignalingLayer = Object.assign(
      new EventEmitter<{ message: (message: object) => void; }>(),
      {
        type: "test",
        send: async () => undefined,
        setup: async () => undefined,
        teardown: async () => undefined,
        status: signalStatus,
        peerKey,
        peerCapabilities,
      },
    );
    const session: Session = {
      status,
      signalStatus,
      error,
      peerInfo,
      connect: vi.fn(async () => undefined),
      close,
      send: vi.fn(),
      getHandshakeParameters: vi.fn(),
      emitter: new EventEmitter(),
      _internal: {
        signal,
        transport: undefined,
      },
    };

    vi.mocked(createSession).mockResolvedValue(session);
    const provider = createProvider({ storage: undefined });
    const starting = provider.createSession({ p: "ntfy", s: "https://relay.test" });

    await provider.session.until(current => current === session);
    await provider.closeSession();

    await expect(starting).resolves.toBe(session);
    expect(close).toHaveBeenCalledOnce();
    expect(provider.session.get()).toBeUndefined();
    expect(provider.status.get()).toBe(ProviderStatus.STANDBY);
    expect(provider.error.get()).toBeUndefined();
  });
});
