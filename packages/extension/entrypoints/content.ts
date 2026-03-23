import {
  encodeConnectionURL,
  type SessionLinkParameters,
} from "@openlv/core";
import {
  createProvider,
  PROVIDER_STATUS,
} from "@openlv/provider";
import type { Session, SessionStateObject } from "@openlv/session";

import { defineContentScript } from "#imports";

import {
  CONTENT_MSG,
  CONTENT_SOURCE,
  PAGE_MSG,
  PAGE_SOURCE,
} from "../utils/bridge.js";
import { createWxtProviderStorage } from "../utils/wxt-storage-shim.js";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  async main() {
    if (!["http:", "https:"].includes(globalThis.location.protocol)) return;

    const origin = globalThis.location.origin;

    const script = document.createElement("script");

    script.src = chrome.runtime.getURL("injected.js");
    script.addEventListener("load", () => script.remove());
    (document.head || document.documentElement).append(script);

    const providerStorage = await createWxtProviderStorage();

    let lastRequestUserActivated = false;

    const provider = createProvider({ providerStorage });

    let sessionRef: Session | undefined;
    let sessionStateHandler:
      | ((state?: SessionStateObject) => void)
      | undefined;

    const resetConnectFlow = () => {
      if (sessionRef && sessionStateHandler) {
        sessionRef.emitter.off("state_change", sessionStateHandler);
      }

      sessionRef = undefined;
      sessionStateHandler = undefined;
    };

    provider.on("status_change", (status) => {
      if (
        status === PROVIDER_STATUS.CREATING
        || status === PROVIDER_STATUS.CONNECTING
        || status === PROVIDER_STATUS.CONNECTED
      ) {
        const session = provider.getSession();

        if (session && session !== sessionRef) {
          if (sessionRef && sessionStateHandler) {
            sessionRef.emitter.off("state_change", sessionStateHandler);
          }

          sessionRef = session;

          const handshakeParams = session.getHandshakeParameters();

          try {
            const uri = encodeConnectionURL(handshakeParams);

            chrome.runtime.sendMessage({ type: "OPEN_POPUP", uri }).catch(() => {});
            chrome.runtime.sendMessage({ type: "UPDATED_SESSION_METADATA", handshakeParams }).catch(() => {});
          }
          catch (error) {
            console.error("[openlv] Failed to encode connection URL:", error);
          }

          sessionStateHandler = (sessionState) => {
            chrome.runtime
              .sendMessage({ type: "SESSION_STATE", state: sessionState?.status })
              .catch(() => {});
          };

          session.emitter.on("state_change", sessionStateHandler);

          // Manually blast the very first state out
          chrome.runtime
            .sendMessage({ type: "SESSION_STATE", state: session.getState()?.status })
            .catch(() => {});
        }
      }

      if (status === PROVIDER_STATUS.STANDBY || status === PROVIDER_STATUS.ERROR) {
        resetConnectFlow();
      }

      chrome.runtime.sendMessage({ type: "PROVIDER_STATUS", status }).catch(() => {});
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "CANCEL_SESSION") {
        provider.closeSession();
        resetConnectFlow();
      }
      else if (message.type === "CREATE_SESSION") {
        const parameters = message.parameters as SessionLinkParameters | undefined;

        provider.closeSession()
          .then(() => {
            provider.createSession(parameters).catch((error) => {
              console.error("[openlv] Manual session creation failed:", error);
            });
          })
          .catch(() => {});
      }
    });

    const internalEvents = new Set(["status_change", "session_started"]);
    const eventHandlers = new Map<string, (data: unknown) => void>();
    const eventProvider = provider as unknown as {
      on(event: string, handler: (data: unknown) => void): void;
      off(event: string, handler: (data: unknown) => void): void;
    };

    globalThis.addEventListener("message", async (event) => {
      if (event.source !== globalThis.window) return;

      const msg = event.data as Record<string, unknown>;

      if (!msg || msg.source !== PAGE_SOURCE || !Object.values(PAGE_MSG).includes(msg.type as never)) {
        return;
      }

      if (msg.type === PAGE_MSG.SUBSCRIBE) {
        const eventName = msg.event as string;

        if (internalEvents.has(eventName) || eventHandlers.has(eventName)) return;

        const handler = (data: unknown) =>
          globalThis.postMessage({ source: CONTENT_SOURCE, type: CONTENT_MSG.EVENT, event: eventName, data }, origin);

        eventHandlers.set(eventName, handler);
        eventProvider.on(eventName, handler);

        return;
      }

      if (msg.type === PAGE_MSG.UNSUBSCRIBE) {
        const handler = eventHandlers.get(msg.event as string);

        if (!handler) return;

        eventProvider.off(msg.event as string, handler);
        eventHandlers.delete(msg.event as string);

        return;
      }

      if (msg.type !== PAGE_MSG.REQUEST) return;

      const { requestId, payload, userActivated } = msg as { requestId: number; payload: { method: string; params?: unknown; }; userActivated?: boolean; };

      lastRequestUserActivated = !!userActivated;

      if (payload.method === "eth_requestAccounts") {
        // Close any existing session so we always go through the popup.
        if (provider.getSession()) {
          await provider.closeSession();
        }

        // Block auto-reconnect on page load. The injected script sends
        // hasBeenActive from the page context — false on a fresh page
        // before any user interaction.
        if (!lastRequestUserActivated) {
          globalThis.postMessage(
            { source: CONTENT_SOURCE, type: CONTENT_MSG.RESPONSE, requestId, error: { message: "User rejected the request.", code: 4001 } },
            origin,
          );

          return;
        }

        // Open popup and wait for the user to connect or dismiss.
        chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(() => {});

        await new Promise<void>((resolve) => {
          const done = () => {
            provider.off("connect", done);
            provider.off("disconnect", done);
            resolve();
          };

          provider.on("connect", done);
          provider.on("disconnect", done);
        });

        if (!provider.getSession()) {
          globalThis.postMessage(
            { source: CONTENT_SOURCE, type: CONTENT_MSG.RESPONSE, requestId, result: [] },
            origin,
          );

          return;
        }

        // Session is now connected — fall through to provider.request()
        // which will return accounts.
      }

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
