/* eslint-disable no-restricted-syntax */
import { decodeConnectionURL } from "@openlv/core";
import { OpenLVModalElement, registerOpenLVModal } from "@openlv/modal";
import { simpleTheme } from "@openlv/modal/theme";

import { createFakeProvider } from "./fakeProvider.js";

// --- Query params ---

const uri = new URLSearchParams(location.search).get("uri") ?? "";
const flowToken = new URLSearchParams(location.search).get("flowToken") ?? "";

if (!flowToken) {
  globalThis.close();
  throw new Error("Missing flowToken");
}

let handshakeParams;

try {
  handshakeParams = decodeConnectionURL(uri);
}
catch {
  globalThis.close();
  throw new Error("Invalid connection URL");
}

// --- Modal ---

const provider = await createFakeProvider(flowToken, handshakeParams);

registerOpenLVModal();
const modal = new OpenLVModalElement({
  provider,
  onClose: () => globalThis.close(),
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
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.height > 0 && windowId !== undefined)
      chrome.windows.update(windowId, {
        height: Math.round(entry.contentRect.height) + chromeBarHeight,
      });
  }).observe(card);
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

  mo.observe(modal.shadowRoot!, { childList: true, subtree: true });
}
