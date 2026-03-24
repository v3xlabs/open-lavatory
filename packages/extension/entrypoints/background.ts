import { defineBackground } from "#imports";

/* eslint-disable no-restricted-syntax */
type FlowState = {
  popupWindowId?: number;
  activeTabId?: number;
  lastStatus: string;
  pendingCreateSession?: boolean;
};

export default defineBackground(() => {
  const state: FlowState = { lastStatus: "standby" };

  chrome.runtime.onMessage.addListener((message, sender) => {
    const senderTabId = sender.tab?.id;

    switch (message.type as string) {
      case "OPEN_POPUP": {
        // During session recreation, reuse the existing popup.
        if (state.pendingCreateSession && state.popupWindowId !== undefined) {
          state.pendingCreateSession = false;
          state.activeTabId = senderTabId;
          chrome.windows
            .update(state.popupWindowId, { focused: true })
            .catch(() => {});
          break;
        }

        state.pendingCreateSession = false;

        // Same tab requesting again, just focus the existing popup.
        if (
          state.popupWindowId !== undefined
          && senderTabId === state.activeTabId
        ) {
          chrome.windows
            .update(state.popupWindowId, { focused: true })
            .catch(() => {});
          break;
        }

        // Different tab, close old popup and cancel old session.
        if (state.popupWindowId !== undefined) {
          chrome.windows.remove(state.popupWindowId).catch(() => {});

          if (state.activeTabId !== undefined) {
            chrome.tabs
              .sendMessage(state.activeTabId, { type: "CANCEL_SESSION" })
              .catch(() => {});
          }
        }

        state.popupWindowId = undefined;
        state.activeTabId = senderTabId;
        state.lastStatus = "standby";

        const popupUrl = message.uri
          ? chrome.runtime.getURL("connect.html")
          + "?uri="
          + encodeURIComponent(message.uri as string)
          : chrome.runtime.getURL("connect.html");

        chrome.windows
          .create({
            url: popupUrl,
            type: "popup",
            width: 420,
            height: 600,
            focused: true,
          })
          .then((win) => {
            state.popupWindowId = win?.id;
          });

        break;
      }

      case "PROVIDER_STATUS": {
        if (senderTabId !== state.activeTabId) break;

        state.lastStatus = message.status as string;

        if (message.status === "connected" || message.status === "error") {
          state.pendingCreateSession = false;
        }

        if (message.status === "standby" && !state.pendingCreateSession) {
          if (state.popupWindowId !== undefined) {
            chrome.windows.remove(state.popupWindowId).catch(() => {});
            state.popupWindowId = undefined;
          }

          state.activeTabId = undefined;
        }

        break;
      }

      case "CREATE_SESSION": {
        state.pendingCreateSession = true;

        if (state.activeTabId !== undefined) {
          chrome.tabs
            .sendMessage(state.activeTabId, {
              type: "CREATE_SESSION",
              parameters: message.parameters,
            })
            .catch(() => {});
        }

        break;
      }

      case "CANCEL_SESSION": {
        state.pendingCreateSession = false;

        if (state.activeTabId !== undefined) {
          chrome.tabs
            .sendMessage(state.activeTabId, { type: "CANCEL_SESSION" })
            .catch(() => {});
        }

        break;
      }
    }
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId !== state.popupWindowId) return;

    state.popupWindowId = undefined;
    state.pendingCreateSession = false;

    if (state.activeTabId !== undefined) {
      chrome.tabs
        .sendMessage(state.activeTabId, { type: "CANCEL_SESSION" })
        .catch(() => {});
    }

    state.lastStatus = "standby";
  });
});
