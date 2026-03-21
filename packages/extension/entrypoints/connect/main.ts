/* eslint-disable no-restricted-syntax */
import { decodeConnectionURL } from "@openlv/core";
import { OpenLVModalElement, registerOpenLVModal } from "@openlv/modal";
import { simpleTheme } from "@openlv/modal/theme";

import { createFakeProvider } from "./fakeProvider.js";

const uri = new URLSearchParams(location.search).get("uri") ?? "";

const closePopup = () => {
  globalThis.close();
  chrome.windows.getCurrent().then((win) => {
    if (win?.id !== undefined) {
      chrome.windows.remove(win.id).catch(() => {});
    }
  })
    .catch(() => {});
};

let handshakeParams;

try {
  handshakeParams = decodeConnectionURL(uri);
}
catch {
  closePopup();
  throw new Error("Invalid connection URL");
}

const provider = await createFakeProvider(handshakeParams);

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

  globalThis.addEventListener("beforeunload", () => mo.disconnect());
}
