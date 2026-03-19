/* eslint-disable no-restricted-syntax */
import { decodeConnectionURL } from "@openlv/core";
import { OpenLVModalElement, registerOpenLVModal } from "@openlv/modal";
import { simpleTheme } from "@openlv/modal/theme";

import { createFakeProvider } from "./fakeProvider.js";

// --- Query params ---

const uri = new URLSearchParams(location.search).get("uri") ?? "";
const flowToken = new URLSearchParams(location.search).get("flowToken") ?? "";

const closePopup = () => {
  globalThis.close();
  chrome.windows.getCurrent().then((win) => {
    if (win?.id !== undefined) {
      chrome.windows.remove(win.id).catch(() => {});
    }
  })
    .catch(() => {});
};

if (!flowToken) {
  closePopup();
  throw new Error("Missing flowToken");
}

let handshakeParams;

try {
  handshakeParams = decodeConnectionURL(uri);
}
catch {
  closePopup();
  throw new Error("Invalid connection URL");
}

// --- Modal ---

const provider = await createFakeProvider(flowToken, handshakeParams);

registerOpenLVModal();
const modal = new OpenLVModalElement({
  provider,
  onClose: () => closePopup(),
  theme: {
    theme: {
      common: { border: { radius: "0px" } },
      ...simpleTheme,
    },
  },
});

document.body.append(modal);

// --- Auto-resize popup to match modal card height ---
// The shadow root is open so we query the rendered [role="dialog"] card,
// observe it with ResizeObserver, and call chrome.windows.update on changes.

const { id: windowId } = await chrome.windows.getCurrent();
const chromeBarHeight = globalThis.outerHeight - globalThis.innerHeight;

const observeCardResize = (card: Element) => {
  const ro = new ResizeObserver(([entry]) => {
    if (entry.contentRect.height > 0 && windowId !== undefined)
      chrome.windows.update(windowId, {
        height: Math.round(entry.contentRect.height) + chromeBarHeight,
      });
  });

  ro.observe(card);

  // Clean up when the popup closes
  globalThis.addEventListener("beforeunload", () => ro.disconnect());
};

const card = modal.shadowRoot?.querySelector("[role=dialog]");

if (card) {
  observeCardResize(card);
}
else {
  // Card isn't in the DOM yet (shadow render is async) — wait for it
  const mo = new MutationObserver(() => {
    const found = modal.shadowRoot?.querySelector("[role=dialog]");

    if (found) {
      mo.disconnect();
      observeCardResize(found);
    }
  });

  if (modal.shadowRoot) {
    mo.observe(modal.shadowRoot, { childList: true, subtree: true });
  }

  // Clean up if popup closes before card appears
  globalThis.addEventListener("beforeunload", () => mo.disconnect());
}
