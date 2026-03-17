/** Source tag stamped on every postMessage from the injected page stub */
export const PAGE_SOURCE = "openlv-page" as const;

/** Source tag stamped on every postMessage from the content script */
export const CONTENT_SOURCE = "openlv-content" as const;

/** Message types sent from the injected stub → content script */
export const PAGE_MSG = {
  REQUEST: "REQUEST",
  SUBSCRIBE: "SUBSCRIBE",
  UNSUBSCRIBE: "UNSUBSCRIBE",
} as const;

/** Message types sent from the content script → injected stub */
export const CONTENT_MSG = {
  RESPONSE: "RESPONSE",
  EVENT: "EVENT",
} as const;
