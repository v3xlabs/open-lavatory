/* eslint-disable no-restricted-syntax */
type FlowState = {
  popupWindowId?: number;
  activeTabId?: number;
  activeFlowToken?: string;
  lastStatus: string;
};

const STORAGE_KEY = "@openlv/background/flow";

export default defineBackground(() => {
  const state: FlowState = { lastStatus: "standby" };

  const persist = () =>
    chrome.storage.session.set({ [STORAGE_KEY]: state }).catch(() => {});

  chrome.storage.session.get(STORAGE_KEY).then((stored) => {
    const saved = stored[STORAGE_KEY] as FlowState | undefined;

    if (saved) Object.assign(state, saved);
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    switch (message.type as string) {
      case "OPEN_POPUP": {
        if (
          state.popupWindowId !== undefined
          && message.flowToken === state.activeFlowToken
        ) {
          chrome.windows
            .update(state.popupWindowId, { focused: true })
            .catch(() => {});
          break;
        }

        if (state.popupWindowId !== undefined) {
          chrome.windows.remove(state.popupWindowId).catch(() => {});
        }

        state.popupWindowId = undefined;
        state.activeTabId = sender.tab?.id;
        state.activeFlowToken = message.flowToken as string;
        state.lastStatus = "standby";
        persist();

        chrome.windows
          .create({
            url:
              chrome.runtime.getURL("connect.html")
              + "?uri="
              + encodeURIComponent(message.uri as string)
              + "&flowToken="
              + encodeURIComponent(state.activeFlowToken),
            type: "popup",
            width: 420,
            height: 600,
            focused: true,
          })
          .then((win) => {
            state.popupWindowId = win?.id;
            persist();
          });

        break;
      }

      case "PROVIDER_STATUS": {
        if (message.flowToken !== state.activeFlowToken) break;

        state.lastStatus = message.status as string;

        if (message.status === "standby") {
          state.popupWindowId = undefined;
          state.activeTabId = undefined;
          state.activeFlowToken = undefined;
        }

        persist();
        break;
      }

      case "CANCEL_SESSION": {
        if (message.flowToken !== state.activeFlowToken) break;

        if (state.activeTabId !== undefined) {
          chrome.tabs
            .sendMessage(state.activeTabId, {
              type: "CANCEL_SESSION",
              flowToken: state.activeFlowToken,
            })
            .catch(() => {});
        }

        break;
      }
    }
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId !== state.popupWindowId) return;

    state.popupWindowId = undefined;

    if (state.lastStatus !== "connected" && state.activeTabId !== undefined) {
      chrome.tabs
        .sendMessage(state.activeTabId, {
          type: "CANCEL_SESSION",
          flowToken: state.activeFlowToken,
        })
        .catch(() => {});

      state.activeTabId = undefined;
    }

    state.activeFlowToken = undefined;
    state.lastStatus = "standby";
    persist();
  });
});
