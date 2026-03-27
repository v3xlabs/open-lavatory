/* eslint-disable no-restricted-syntax */
import type {
  SessionHandshakeParameters,
  SessionLinkParameters,
} from "@openlv/core";
import type { OpenLVProvider, ProviderStatus } from "@openlv/provider";
import { PROVIDER_STATUS } from "@openlv/provider";
import type { Session } from "@openlv/session";
import { SESSION_STATE } from "@openlv/session";
import { EventEmitter } from "eventemitter3";

import { createWxtProviderStorage } from "../../utils/wxt-storage-shim.js";

/**
 * Creates a fake OpenLVProvider for the connect popup.
 *
 * The real provider lives in the content script. This mirrors its state by
 * listening to messages relayed from the background.
 */
export const createFakeProvider = async (
  handshakeParams?: SessionHandshakeParameters,
  expectedTabId?: number,
): Promise<OpenLVProvider> => {
  const storage = await createWxtProviderStorage();

  let status: ProviderStatus = PROVIDER_STATUS.STANDBY;
  let sessionState = { status: SESSION_STATE.READY as string };

  const providerEmitter = new EventEmitter();
  let sessionEmitter = new EventEmitter();

  const makeSessionObj = (params: SessionHandshakeParameters) => ({
    getHandshakeParameters: () => params,
    getState: () => sessionState,
    get emitter() {
      return sessionEmitter;
    },
  });

  const initialSession = handshakeParams
    ? makeSessionObj(handshakeParams)
    : undefined;

  let sessionObj: ReturnType<typeof makeSessionObj> | undefined
    = initialSession;

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (expectedTabId !== undefined && sender.tab?.id !== expectedTabId) {
      return;
    }

    switch (message.type) {
      case "PROVIDER_STATUS": {
        status = message.status as ProviderStatus;
        providerEmitter.emit("status_change", status);

        if (status === PROVIDER_STATUS.ERROR) {
          globalThis.close();
          chrome.windows
            .getCurrent()
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
        handshakeParams = message.handshakeParams as SessionHandshakeParameters;
        sessionState = { status: SESSION_STATE.READY as string };
        sessionEmitter = new EventEmitter();
        sessionObj = makeSessionObj(handshakeParams);
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
      chrome.runtime
        .sendMessage({ type: "CREATE_SESSION", parameters })
        .catch(() => {});

      // The real session is created in the content script; this is a no-op
      // that satisfies the type signature for the fake provider.
      return Promise.resolve({} as Session);
    },
    closeSession: async () => {
      chrome.runtime.sendMessage({ type: "CANCEL_SESSION" }).catch(() => {});
    },
    getAccounts: async () => [],
  } as unknown as OpenLVProvider;
};
