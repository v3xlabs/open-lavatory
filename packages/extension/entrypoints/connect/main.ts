/* eslint-disable no-restricted-syntax */
import {
  decodeConnectionURL,
  type SessionHandshakeParameters,
} from "@openlv/core";
import { OpenLVModalElement, registerOpenLVModal } from "@openlv/modal";
import { simpleTheme } from "@openlv/modal/theme";
import { browser } from "wxt/browser";

import { createFakeProvider } from "./fakeProvider.js";

const searchParams = new URLSearchParams(location.search);
const uri = searchParams.get("uri") ?? "";
const tabIdParam = searchParams.get("tabId");
const parsedTabId = tabIdParam ? Number.parseInt(tabIdParam, 10) : Number.NaN;
const expectedTabId = Number.isInteger(parsedTabId) ? parsedTabId : undefined;

const closePopup = () => {
  globalThis.close();
  browser.windows
    .getCurrent()
    .then((win) => {
      if (win?.id !== undefined) {
        browser.windows.remove(win.id).catch(() => {});
      }
    })
    .catch(() => {});
};

let handshakeParams: SessionHandshakeParameters | undefined;

if (uri) {
  try {
    const params = decodeConnectionURL(uri);

    if ("sessionId" in params) {
      handshakeParams = params as SessionHandshakeParameters;
    }
  }
  catch {
    closePopup();
    throw new Error("Invalid connection URL");
  }
}

const provider = await createFakeProvider(handshakeParams, expectedTabId);

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

const { id: windowId } = await browser.windows.getCurrent();
const chromeBarHeight = globalThis.outerHeight - globalThis.innerHeight;

const observeCardResize = (card: Element) => {
  const ro = new ResizeObserver(([entry]) => {
    if (entry.contentRect.height > 0 && windowId !== undefined)
      browser.windows.update(windowId, {
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
  // Card isn't in the DOM yet (shadow render is async)
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
