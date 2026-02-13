/* eslint-disable sonarjs/no-duplicate-string */
// Content script for OpenLV Extension - EIP-6963 Compatible
// This script runs in the context of web pages and provides EIP-1193 wallet connectivity

// eslint-disable-next-line import/no-default-export
export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("OpenLV EIP-6963 Content Script Loaded");

    // Check if OpenLV provider should be injected
    if (shouldInjectProvider()) {
      injectOpenLVProvider();
    }
  },
});

const shouldInjectProvider = (): boolean => {
  // Don't inject on extension pages
  if (
    globalThis.location.protocol === "chrome-extension:"
    || globalThis.location.protocol === "moz-extension:"
  ) {
    return false;
  }

  // Don't inject on local file URLs for security
  if (globalThis.location.protocol === "file:") {
    return false;
  }

  return true;
};

const injectOpenLVProvider = () => {
  // Create script element to inject the provider
  const script = document.createElement("script");

  script.src = chrome.runtime.getURL("injected.js");
  script.addEventListener("load", () => {
    script.remove();
  });

  // Inject before head or body
  const target = document.head || document.documentElement;

  target.append(script);

  // Set up communication bridge between injected script and extension
  setupCommunicationBridge();
};

type ProviderMessage = {
  source?: string;
  type?: string;
  data?: unknown;
  requestId?: string | number;
};

type TypedDataPayload = {
  params: unknown[];
};

const setupCommunicationBridge = () => {
  // Listen for messages from the injected provider
  window.addEventListener("message", async (event) => {
    // Only accept messages from same origin
    if (event.source !== globalThis) return;

    const message = event.data as ProviderMessage;

    if (!message || message.source !== "openlv-provider") return;

    try {
      let response: unknown;

      switch (message.type) {
        case "eth_requestAccounts": {
          response = await handleRequestAccounts();
          break;
        }

        case "eth_getBalance": {
          response = await handleGetBalance(message.data);
          break;
        }

        case "eth_sendTransaction": {
          response = await handleSendTransaction(message.data);
          break;
        }

        case "personal_sign": {
          response = await handlePersonalSign(message.data);
          break;
        }

        case "eth_sign": {
          response = await handleEthSign(message.data);
          break;
        }

        case "eth_signTypedData":
        case "eth_signTypedData_v3":
        case "eth_signTypedData_v4": {
          response = await handleSignTypedData(
            message.type,
            message.data,
          );
          break;
        }

        case "wallet_switchEthereumChain": {
          response = await handleSwitchChain(message.data);
          break;
        }

        case "wallet_addEthereumChain": {
          response = await handleAddChain(message.data);
          break;
        }

        case "wallet_getPermissions": {
          response = await handleGetPermissions();
          break;
        }

        case "wallet_requestPermissions": {
          response = await handleRequestPermissions(message.data);
          break;
        }

        case "forward_request": {
          response = await handleForwardRequest(message.data);
          break;
        }

        default: {
          response = {
            success: false,
            error: "Unknown message type",
          };
        }
      }

      // Send response back to injected provider
      window.postMessage(
        {
          source: "openlv-content-script",
          requestId: message.requestId,
          response,
        },
        "*",
      );
    }
    catch (error) {
      // Send error response back to injected provider
      window.postMessage(
        {
          source: "openlv-content-script",
          requestId: message.requestId,
          response: {
            success: false,
            error:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
          },
        },
        "*",
      );
    }
  });

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message) => {
    // Forward relevant messages to injected provider
    if (
      message.type
      && [
        "accountsChanged",
        "chainChanged",
        "connect",
        "disconnect",
      ].includes(message.type)
    ) {
      window.postMessage(
        {
          source: "openlv-content-script",
          type: message.type,
          data: message.data,
        },
        "*",
      );
    }
  });
};

// Handler functions for EIP-1193 methods

const handleRequestAccounts = async () => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "eth_requestAccounts",
      data: { tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: { accounts: response.accounts || [] },
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to request accounts",
    };
  }
};

const handleGetBalance = async (data: {
  address: string;
  blockTag: string;
}) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "eth_getBalance",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.balance,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to get balance",
    };
  }
};

const handleSendTransaction = async (data: {
  transaction: Record<string, unknown>;
}) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "eth_sendTransaction",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.hash,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to send transaction",
    };
  }
};

const handlePersonalSign = async (data: {
  message: string;
  address: string;
}) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "personal_sign",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.signature,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to sign message",
    };
  }
};

const handleEthSign = async (data: { address: string; message: string; }) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "eth_sign",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.signature,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to sign message",
    };
  }
};

const handleSignTypedData = async (method: string, data: TypedDataPayload) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: method,
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.signature,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to sign typed data",
    };
  }
};

const handleSwitchChain = async (data: { chainId?: string; }) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "wallet_switchEthereumChain",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: { chainId: response.chainId },
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to switch chain",
    };
  }
};

const handleAddChain = async (data: Record<string, unknown>) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "wallet_addEthereumChain",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error ? error.message : "Failed to add chain",
    };
  }
};

const handleGetPermissions = async () => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "wallet_getPermissions",
      data: { tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.permissions || [],
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to get permissions",
    };
  }
};

const handleRequestPermissions = async (data: { permissions: unknown; }) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "wallet_requestPermissions",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.permissions || [],
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to request permissions",
    };
  }
};

const handleForwardRequest = async (data: {
  method: string;
  params: unknown[];
}) => {
  try {
    const response = await browser.runtime.sendMessage({
      type: "forward_request",
      data: { ...data, tabId: await getCurrentTabId() },
    });

    return {
      success: true,
      data: response.result,
    };
  }
  catch (error) {
    return {
      success: false,
      error:
                error instanceof Error
                  ? error.message
                  : "Failed to forward request",
    };
  }
};

const getCurrentTabId = async (): Promise<number> =>
  new Promise((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // eslint-disable-next-line no-restricted-syntax
      resolve(tabs[0]?.id || 0);
    });
  });
