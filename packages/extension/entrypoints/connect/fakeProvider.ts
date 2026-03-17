import type { SessionHandshakeParameters } from "@openlv/core";
import type { OpenLVProvider, ProviderStatus } from "@openlv/provider";
import {
  createProviderStorage,
  createSyncStorage,
  PROVIDER_STATUS,
} from "@openlv/provider";
import { SESSION_STATE } from "@openlv/session";

type Listener = (...args: unknown[]) => void;

const createEmitter = () => {
  const map = new Map<string, Set<Listener>>();

  return {
    on(event: string, fn: Listener) {
      if (!map.has(event)) map.set(event, new Set());

      map.get(event)!.add(fn);
    },
    off(event: string, fn: Listener) {
      map.get(event)?.delete(fn);
    },
    emit(event: string, ...args: unknown[]) {
      map.get(event)?.forEach(fn => fn(...args));
    },
  };
};

/**
 * Creates a fake OpenLVProvider for the connect popup.
 *
 * The real provider lives in the content script. This mirrors its state by
 * listening to messages relayed from the background, and delegates session
 * actions (cancel) back through the background to the content script.
 */
export const createFakeProvider = async (
  flowToken: string,
  handshakeParams: SessionHandshakeParameters,
): Promise<OpenLVProvider> => {
  const stored = await chrome.storage.local.get("@openlv/connector/settings");
  const raw = stored["@openlv/connector/settings"] as string | undefined;

  const storage = createProviderStorage({
    storage: createSyncStorage(
      raw ? { "@openlv/connector/settings": raw } : undefined,
      (key, value) => chrome.storage.local.set({ [key]: value }),
    ),
  });

  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let sessionState = { status: SESSION_STATE.READY as string };
  let seenConnecting = false;

  const providerEmitter = createEmitter();
  const sessionEmitter = createEmitter();

  chrome.runtime.onMessage.addListener((message) => {
    if (message.flowToken !== flowToken) return;

    if (message.type === "PROVIDER_STATUS") {
      status = message.status as ProviderStatus;

      if (status === PROVIDER_STATUS.CONNECTING) seenConnecting = true;

      providerEmitter.emit("status_change", status);

      if (
        (seenConnecting && status === PROVIDER_STATUS.STANDBY)
        || status === PROVIDER_STATUS.ERROR
      )
        globalThis.close();
    }
    else if (message.type === "SESSION_STATE") {
      sessionState = { status: message.state as string };
      sessionEmitter.emit("state_change", sessionState);
    }
  });

  return {
    getState: () => ({ status }),
    getSession: () => ({
      getHandshakeParameters: () => handshakeParams,
      getState: () => sessionState,
      emitter: sessionEmitter,
    }),
    on: providerEmitter.on.bind(providerEmitter),
    off: providerEmitter.off.bind(providerEmitter),
    storage,
    createSession: () => {
      status = PROVIDER_STATUS.CONNECTING;
      providerEmitter.emit("status_change", status);

      return Promise.resolve({} as never);
    },
    closeSession: async () => {
      chrome.runtime
        .sendMessage({ type: "CANCEL_SESSION", flowToken })
        .catch(() => {});
      globalThis.close();
    },
    getAccounts: async () => [],
  } as unknown as OpenLVProvider;
};
