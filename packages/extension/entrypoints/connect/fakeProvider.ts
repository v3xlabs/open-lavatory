/* eslint-disable no-restricted-syntax */
import type { SessionHandshakeParameters } from "@openlv/core";
import type { OpenLVProvider, ProviderStatus } from "@openlv/provider";
import {
  createProviderStorage,
  PROVIDER_STATUS,
} from "@openlv/provider";
import type { Session } from "@openlv/session";
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
 * listening to messages relayed from the background.
 */
export const createFakeProvider = async (
  flowToken: string,
  handshakeParams: SessionHandshakeParameters,
): Promise<OpenLVProvider> => {
  const stored = await chrome.storage.local.get("@openlv/connector/settings");
  let raw = stored["@openlv/connector/settings"] as string | undefined;

  chrome.storage.local.onChanged.addListener((changes, area) => {
    if (area === "local" && changes["@openlv/connector/settings"]) {
      raw = changes["@openlv/connector/settings"].newValue as string | undefined;
    }
  });

  const storageBackend = {
    getItem: (key: string) => (key === "@openlv/connector/settings" ? (raw ?? null) : null),
    setItem: (key: string, value: string) => {
      if (key === "@openlv/connector/settings") {
        raw = value;
        chrome.storage.local.set({ [key]: value }).catch(() => {});
      }
    },
    removeItem: (key: string) => {
      if (key === "@openlv/connector/settings") {
        raw = undefined;
        chrome.storage.local.remove(key).catch(() => {});
      }
    },
    clear: () => {},
    length: 1,
    key: () => "@openlv/connector/settings",
  } as unknown as Storage;

  const storage = createProviderStorage({
    storage: storageBackend,
  });

  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let sessionState = { status: SESSION_STATE.READY as string };

  const providerEmitter = createEmitter();
  let sessionEmitter = createEmitter();

  let sessionObj = {
    getHandshakeParameters: () => handshakeParams,
    getState: () => sessionState,
    get emitter() { return sessionEmitter; },
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message.flowToken !== flowToken) return;

    switch (message.type) {
      case "PROVIDER_STATUS": {
        status = message.status as ProviderStatus;

        providerEmitter.emit("status_change", status);

        if (status === PROVIDER_STATUS.ERROR) {
          globalThis.close();
          chrome.windows.getCurrent().then((win) => {
            if (win?.id !== undefined) {
              chrome.windows.remove(win.id).catch(() => {});
            }
          })
            .catch(() => {});
        }

        break;
      }
      case "SESSION_STATE": {
        sessionState = { status: message.state as string };
        sessionEmitter.emit("state_change", sessionState);

        break;
      }
      case "UPDATED_SESSION_METADATA": {
        handshakeParams = message.handshakeParams;
        sessionState = { status: SESSION_STATE.READY as string };
        sessionEmitter = createEmitter();
        sessionObj = {
          getHandshakeParameters: () => handshakeParams,
          getState: () => sessionState,
          get emitter() { return sessionEmitter; },
        };
        providerEmitter.emit("session_started", sessionObj);

        break;
      }
    // No default
    }
  });

  return {
    getState: () => ({ status }),
    getSession: () => sessionObj,
    on: providerEmitter.on.bind(providerEmitter),
    off: providerEmitter.off.bind(providerEmitter),
    storage,
    createSession: (parameters?: any) => {
      status = PROVIDER_STATUS.CONNECTING;
      providerEmitter.emit("status_change", status);

      chrome.runtime
        .sendMessage({ type: "CREATE_SESSION", flowToken, parameters })
        .catch(() => {});

      // The real session is created in the content script; this is a no-op
      // that satisfies the type signature for the fake provider.
      return Promise.resolve({} as Session);
    },
    closeSession: async () => {
      chrome.runtime
        .sendMessage({ type: "CANCEL_SESSION", flowToken })
        .catch(() => {});
    },
    getAccounts: async () => [],
  } as unknown as OpenLVProvider;
};
