import type { SessionLinkParameters } from "@openlv/core";
import { createProvider, PROVIDER_STATUS } from "@openlv/provider";
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
    const provider = createProvider({ providerStorage });

    let sessionRef: Session | undefined;
    let sessionStateHandler: ((state?: SessionStateObject) => void) | undefined;

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
      ) {
        const session = provider.getSession();

        if (session && session !== sessionRef) {
          if (sessionRef && sessionStateHandler) {
            sessionRef.emitter.off("state_change", sessionStateHandler);
          }

          sessionRef = session;

          const handshakeParams = session.getHandshakeParameters();

          chrome.runtime
            .sendMessage({
              type: "UPDATED_SESSION_METADATA",
              handshakeParams,
            })
            .catch(() => {});

          sessionStateHandler = (sessionState) => {
            chrome.runtime
              .sendMessage({
                type: "SESSION_STATE",
                state: sessionState?.status,
              })
              .catch(() => {});
          };

          session.emitter.on("state_change", sessionStateHandler);

          // Manually blast the very first state out
          chrome.runtime
            .sendMessage({
              type: "SESSION_STATE",
              state: session.getState()?.status,
            })
            .catch(() => {});
        }
      }

      if (
        status === PROVIDER_STATUS.STANDBY
        || status === PROVIDER_STATUS.ERROR
      ) {
        resetConnectFlow();
      }

      chrome.runtime
        .sendMessage({ type: "PROVIDER_STATUS", status })
        .catch(() => {});
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "CANCEL_SESSION") {
        const currentStatus = provider.getState().status;

        resetConnectFlow();

        if (currentStatus !== PROVIDER_STATUS.CONNECTED) {
          provider.closeSession();
        }
      }
      else if (message.type === "CREATE_SESSION") {
        const parameters = message.parameters as
          | SessionLinkParameters
          | undefined;
        const currentStatus = provider.getState().status;

        if (currentStatus === PROVIDER_STATUS.CONNECTED) {
          return;
        }

        if (
          currentStatus === PROVIDER_STATUS.CREATING
          || currentStatus === PROVIDER_STATUS.CONNECTING
        ) {
          return;
        }

        provider.createSession(parameters).catch((error) => {
          const message
            = error instanceof Error ? error.message : String(error);

          if (!/session closed/i.test(message)) {
            console.error("[openlv] Manual session creation failed:", error);
          }
        });
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

      if (
        !msg
        || msg.source !== PAGE_SOURCE
        || !Object.values(PAGE_MSG).includes(msg.type as never)
      ) {
        return;
      }

      if (msg.type === PAGE_MSG.SUBSCRIBE) {
        const eventName = msg.event as string;

        if (internalEvents.has(eventName) || eventHandlers.has(eventName))
          return;

        const handler = (data: unknown) =>
          globalThis.postMessage(
            {
              source: CONTENT_SOURCE,
              type: CONTENT_MSG.EVENT,
              event: eventName,
              data,
            },
            origin,
          );

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

      const { requestId, payload, userActivated } = msg as {
        requestId: number;
        payload: { method: string; params?: unknown; };
        userActivated?: boolean;
      };

      if (payload.method === "eth_requestAccounts") {
        try {
          if (provider.getSession()) {
            resetConnectFlow();
            await provider.closeSession();
          }

          if (!userActivated) {
            throw { message: "User rejected the request.", code: 4001 };
          }

          await new Promise<void>((resolve) => {
            const complete = () => {
              provider.off("connect", complete);
              provider.off("status_change", checkStatus);
              resolve();
            };

            const checkStatus = (status: string) => {
              if (
                status === PROVIDER_STATUS.STANDBY
                || status === PROVIDER_STATUS.ERROR
              ) {
                complete();
              }
            };

            provider.on("connect", complete);
            provider.on("status_change", checkStatus);

            chrome.runtime
              .sendMessage({ type: "OPEN_POPUP" })
              .catch(() => complete());
          });

          if (!provider.getSession()) {
            throw { message: "User rejected the request.", code: 4001 };
          }

          const result = await provider.request({ method: "eth_accounts" });

          if (result instanceof Error) throw result;

          globalThis.postMessage(
            {
              source: CONTENT_SOURCE,
              type: CONTENT_MSG.RESPONSE,
              requestId,
              result,
            },
            origin,
          );
        }
        catch (error: unknown) {
          const typedError = error as { message?: string; code?: number; };

          globalThis.postMessage(
            {
              source: CONTENT_SOURCE,
              type: CONTENT_MSG.RESPONSE,
              requestId,
              error: {
                message: typedError.message || "Internal error",
                code: typedError.code || -32_603,
              },
            },
            origin,
          );
        }

        return;
      }

      if (
        !provider.getSession()
        && (payload.method === "eth_accounts"
          || payload.method === "wallet_requestPermissions")
      ) {
        globalThis.postMessage(
          {
            source: CONTENT_SOURCE,
            type: CONTENT_MSG.RESPONSE,
            requestId,
            result: [],
          },
          origin,
        );

        return;
      }

      try {
        const rawResult = await provider.request(payload);

        if (rawResult instanceof Error) {
          throw rawResult;
        }

        globalThis.postMessage(
          {
            source: CONTENT_SOURCE,
            type: CONTENT_MSG.RESPONSE,
            requestId,
            result: rawResult,
          },
          origin,
        );
      }
      catch (error: unknown) {
        const { message, code } = error as { message?: string; code?: number; };

        globalThis.postMessage(
          {
            source: CONTENT_SOURCE,
            type: CONTENT_MSG.RESPONSE,
            requestId,
            error: { message, code },
          },
          origin,
        );
      }
    });
  },
});
