/* eslint-disable no-restricted-syntax */
import type {
  SessionHandshakeParameters,
  SessionLinkParameters,
} from "@openlv/core";
import type { OpenLVProvider, ProviderStatus } from "@openlv/provider";
import { PROVIDER_STATUS } from "@openlv/provider";
import type { Session } from "@openlv/session";
import { SESSION_STATE } from "@openlv/session";

import { createWxtProviderStorage } from "../../utils/wxt-storage-shim.js";

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
  const storage = await createWxtProviderStorage();

  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let sessionState = { status: SESSION_STATE.READY as string };
  let pendingRecreate = false;

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
        const newStatus = message.status as ProviderStatus;

        // During session recreation (close → create), a transient STANDBY
        // fires before CREATING. Suppress it so the modal doesn't flash.
        if (newStatus === PROVIDER_STATUS.STANDBY && pendingRecreate) {
          pendingRecreate = false;
          break;
        }

        pendingRecreate = false;
        status = newStatus;
        providerEmitter.emit("status_change", status);

        if (status === PROVIDER_STATUS.ERROR) {
          globalThis.close();
          chrome.windows.getCurrent()
            .then((win) => {
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
    createSession: (parameters?: SessionLinkParameters) => {
      pendingRecreate = true;

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
