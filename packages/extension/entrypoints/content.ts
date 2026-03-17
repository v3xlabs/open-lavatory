import { encodeConnectionURL } from "@openlv/core";
import {
  createProvider,
  createSyncStorage,
  PROVIDER_STATUS,
} from "@openlv/provider";

import {
  CONTENT_MSG,
  CONTENT_SOURCE,
  PAGE_MSG,
  PAGE_SOURCE,
} from "../utils/bridge.js";

const buildStorage = async () => {
  const stored = await chrome.storage.local.get("@openlv/connector/settings");
  const raw = stored["@openlv/connector/settings"] as string | undefined;

  return createSyncStorage(
    raw ? { "@openlv/connector/settings": raw } : undefined,
    (key, value) => chrome.storage.local.set({ [key]: value }),
  );
};

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  async main() {
    if (!["http:", "https:"].includes(globalThis.location.protocol)) return;

    const origin = globalThis.location.origin;
    const flowToken = crypto.randomUUID();
    let activeTabFlowToken: string | undefined;

    const script = document.createElement("script");

    script.src = chrome.runtime.getURL("injected.js");
    script.addEventListener("load", () => script.remove());
    (document.head || document.documentElement).append(script);

    const storage = await buildStorage();
    const provider = createProvider({
      storage,
      openModal: async (providerRef) => {
        if (providerRef.getState().status !== PROVIDER_STATUS.STANDBY) {
          return;
        }

        const { signaling } = providerRef.storage.getSettings() ?? {};
        const protocol = signaling?.p;
        const server = protocol ? signaling?.s?.[protocol] : undefined;

        providerRef
          .createSession(protocol && server ? { p: protocol, s: server } : undefined)
          .catch(error => console.error("[openlv] Session creation failed:", error));
      },
    });

    let sessionRef: object | undefined;
    let sessionStateRelayAttached = false;

    const resetConnectFlow = () => {
      sessionRef = undefined;
      sessionStateRelayAttached = false;
    };

    provider.on("status_change", (status) => {
      if (
        status === PROVIDER_STATUS.CREATING
        || status === PROVIDER_STATUS.CONNECTING
        || status === PROVIDER_STATUS.CONNECTED
      ) {
        const session = provider.getSession();

        if (session && session !== sessionRef) {
          sessionRef = session;

          try {
            const uri = encodeConnectionURL(session.getHandshakeParameters());

            chrome.runtime.sendMessage({ type: "OPEN_POPUP", uri, flowToken }).catch(() => {});
          }
          catch (error) {
            console.error("[openlv] Failed to encode connection URL:", error);
          }
        }

        if (session && !sessionStateRelayAttached) {
          sessionStateRelayAttached = true;
          session.emitter.on("state_change", (sessionState) => {
            chrome.runtime
              .sendMessage({ type: "SESSION_STATE", state: sessionState?.status, flowToken })
              .catch(() => {});
          });
        }
      }

      if (status === PROVIDER_STATUS.STANDBY || status === PROVIDER_STATUS.ERROR) {
        resetConnectFlow();
      }

      chrome.runtime.sendMessage({ type: "PROVIDER_STATUS", status, flowToken }).catch(() => {});
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "CANCEL_SESSION" && message.flowToken === flowToken) {
        provider.closeSession();
        resetConnectFlow();
      }
    });

    const allowedEvents = new Set(["accountsChanged", "chainChanged", "connect", "disconnect", "message"]);
    const eventHandlers = new Map<string, (data: unknown) => void>();

    globalThis.addEventListener("message", async (event) => {
      if (event.source !== globalThis.window) return;

      const msg = event.data as Record<string, unknown>;

      if (!msg || msg.source !== PAGE_SOURCE || !Object.values(PAGE_MSG).includes(msg.type as never)) {
        return;
      }

      const tabFlowToken = typeof msg.tabFlowToken === "string" ? msg.tabFlowToken : undefined;

      if (!tabFlowToken) return;

      if (!activeTabFlowToken) activeTabFlowToken = tabFlowToken;
      else if (activeTabFlowToken !== tabFlowToken) return;

      if (msg.type === PAGE_MSG.SUBSCRIBE) {
        const eventName = msg.event as string;

        if (!allowedEvents.has(eventName) || eventHandlers.has(eventName)) return;

        const handler = (data: unknown) =>
          globalThis.postMessage({ source: CONTENT_SOURCE, type: CONTENT_MSG.EVENT, event: eventName, data }, origin);

        eventHandlers.set(eventName, handler);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (provider as any).on(eventName, handler);

        return;
      }

      if (msg.type === PAGE_MSG.UNSUBSCRIBE) {
        const handler = eventHandlers.get(msg.event as string);

        if (!handler) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (provider as any).off(msg.event as string, handler);
        eventHandlers.delete(msg.event as string);

        return;
      }

      if (msg.type !== PAGE_MSG.REQUEST) return;

      const { requestId, payload } = msg as { requestId: number; payload: { method: string; params?: unknown; }; };

      if (payload.method === "wallet_requestPermissions" && !provider.getSession()) {
        globalThis.postMessage(
          { source: CONTENT_SOURCE, type: CONTENT_MSG.RESPONSE, requestId, result: [] },
          origin,
        );

        return;
      }

      try {
        const result = await provider.request(payload);

        globalThis.postMessage(
          { source: CONTENT_SOURCE, type: CONTENT_MSG.RESPONSE, requestId, result },
          origin,
        );
      }
      catch (error: unknown) {
        const { message, code } = error as { message?: string; code?: number; };

        globalThis.postMessage(
          { source: CONTENT_SOURCE, type: CONTENT_MSG.RESPONSE, requestId, error: { message, code } },
          origin,
        );
      }
    });
  },
});
