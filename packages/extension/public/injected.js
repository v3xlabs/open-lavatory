// EIP-6963 Compatible Wallet Provider - Injected Script
// This script implements EIP-6963 Multi Injected Provider Discovery
// import { createProvider } from "@openlv/provider";
const { createProvider } = require("@openlv/provider");

(() => {
  // Prevent multiple injections
  if (window.openlv && window.openlv.isOpenLV) {
    return;
  }

  console.log("OpenLV EIP-6963 Provider Injected");

  // // EIP-1193 Provider Implementation
  // class OpenLVProvider {
  //   constructor() {
  //     this.isOpenLV = true;
  //     this.isConnected = false;
  //     this.selectedAddress = null;
  //     this.chainId = "0x1"; // Default to Ethereum mainnet
  //     this.accounts = [];
  //     this.networkVersion = "1";

  //     // Event handling
  //     this._events = {};
  //     this._requestId = 0;
  //     this._pendingRequests = new Map();

  //     // Set up communication with content script
  //     this._setupCommunication();
  //   }

  //   // EIP-1193 request method
  //   async request({ method, params = [] }) {
  //     if (!method) {
  //       throw new Error("Method is required");
  //     }

  //     // Handle standard Ethereum methods
  //     switch (method) {
  //       case "eth_requestAccounts":
  //         return this._requestAccounts();

  //       case "eth_accounts":
  //         return this.accounts;

  //       case "eth_chainId":
  //         return this.chainId;

  //       case "eth_getBalance":
  //         return this._getBalance(params[0], params[1]);

  //       case "eth_sendTransaction":
  //         return this._sendTransaction(params[0]);

  //       case "personal_sign":
  //         return this._personalSign(params[0], params[1]);

  //       case "eth_sign":
  //         return this._ethSign(params[0], params[1]);

  //       case "eth_signTypedData":
  //       case "eth_signTypedData_v3":
  //       case "eth_signTypedData_v4":
  //         return this._signTypedData(method, params);

  //       case "wallet_switchEthereumChain":
  //         return this._switchChain(params[0]);

  //       case "wallet_addEthereumChain":
  //         return this._addChain(params[0]);

  //       case "wallet_getPermissions":
  //         return this._getPermissions();

  //       case "wallet_requestPermissions":
  //         return this._requestPermissions(params[0]);

  //       default:
  //         return this._forwardRequest(method, params);
  //     }
  //   }

  //   // Event handling methods
  //   on(event, callback) {
  //     if (!this._events[event]) {
  //       this._events[event] = [];
  //     }

  //     this._events[event].push(callback);
  //   }

  //   removeListener(event, callback) {
  //     if (!this._events[event]) return;

  //     this._events[event] = this._events[event].filter((cb) => cb !== callback);
  //   }

  //   removeAllListeners(event) {
  //     if (event) {
  //       delete this._events[event];
  //     } else {
  //       this._events = {};
  //     }
  //   }

  //   _emit(event, ...args) {
  //     if (!this._events[event]) return;

  //     this._events[event].forEach((callback) => {
  //       try {
  //         callback(...args);
  //       } catch (error) {
  //         console.error("Event handler error:", error);
  //       }
  //     });
  //   }

  //   // Setup communication with content script
  //   _setupCommunication() {
  //     window.addEventListener("message", (event) => {
  //       if (event.source !== window) return;

  //       const message = event.data;

  //       if (!message || message.source !== "openlv-content-script") return;

  //       this._handleContentScriptMessage(message);
  //     });
  //   }

  //   _handleContentScriptMessage(message) {
  //     if (message.requestId && this._pendingRequests.has(message.requestId)) {
  //       const { resolve, reject } = this._pendingRequests.get(
  //         message.requestId,
  //       );

  //       this._pendingRequests.delete(message.requestId);

  //       if (message.response.success) {
  //         resolve(message.response.data);
  //       } else {
  //         reject(new Error(message.response.error || "Request failed"));
  //       }
  //     }

  //     // Handle events from background
  //     if (message.type === "accountsChanged") {
  //       this.accounts = message.data.accounts || [];
  //       this.selectedAddress = this.accounts[0] || null;
  //       this._emit("accountsChanged", this.accounts);
  //     } else if (message.type === "chainChanged") {
  //       this.chainId = message.data.chainId;
  //       this._emit("chainChanged", this.chainId);
  //     } else if (message.type === "connect") {
  //       this.isConnected = true;
  //       this._emit("connect", { chainId: this.chainId });
  //     } else if (message.type === "disconnect") {
  //       this.isConnected = false;
  //       this.accounts = [];
  //       this.selectedAddress = null;
  //       this._emit("disconnect", message.data);
  //     }
  //   }

  //   async _sendToContentScript(type, data = {}) {
  //     return new Promise((resolve, reject) => {
  //       const requestId = ++this._requestId;

  //       this._pendingRequests.set(requestId, { resolve, reject });

  //       window.postMessage(
  //         {
  //           source: "openlv-provider",
  //           type,
  //           data,
  //           requestId,
  //         },
  //         "*",
  //       );

  //       // Set timeout for request
  //       setTimeout(() => {
  //         if (this._pendingRequests.has(requestId)) {
  //           this._pendingRequests.delete(requestId);
  //           reject(new Error("Request timeout"));
  //         }
  //       }, 30000);
  //     });
  //   }

  //   async _requestAccounts() {
  //     try {
  //       const result = await this._sendToContentScript("eth_requestAccounts");

  //       this.accounts = result.accounts || [];
  //       this.selectedAddress = this.accounts[0] || null;
  //       this.isConnected = this.accounts.length > 0;

  //       if (this.isConnected) {
  //         this._emit("connect", { chainId: this.chainId });
  //         this._emit("accountsChanged", this.accounts);
  //       }

  //       return this.accounts;
  //     } catch (error) {
  //       console.error("Failed to request accounts:", error);
  //       throw error;
  //     }
  //   }

  //   async _getBalance(address, blockTag = "latest") {
  //     return this._sendToContentScript("eth_getBalance", { address, blockTag });
  //   }

  //   async _sendTransaction(transactionObject) {
  //     return this._sendToContentScript("eth_sendTransaction", {
  //       transaction: transactionObject,
  //     });
  //   }

  //   async _personalSign(message, address) {
  //     return this._sendToContentScript("personal_sign", { message, address });
  //   }

  //   async _ethSign(address, message) {
  //     return this._sendToContentScript("eth_sign", { address, message });
  //   }

  //   async _signTypedData(method, params) {
  //     return this._sendToContentScript(method, { params });
  //   }

  //   async _switchChain(chainParams) {
  //     const result = await this._sendToContentScript(
  //       "wallet_switchEthereumChain",
  //       chainParams,
  //     );

  //     if (result.chainId) {
  //       this.chainId = result.chainId;
  //       this._emit("chainChanged", this.chainId);
  //     }

  //     return result;
  //   }

  //   async _addChain(chainParams) {
  //     return this._sendToContentScript("wallet_addEthereumChain", chainParams);
  //   }

  //   async _getPermissions() {
  //     return this._sendToContentScript("wallet_getPermissions");
  //   }

  //   async _requestPermissions(permissions) {
  //     return this._sendToContentScript("wallet_requestPermissions", {
  //       permissions,
  //     });
  //   }

  //   async _forwardRequest(method, params) {
  //     return this._sendToContentScript("forward_request", { method, params });
  //   }

  //   // Backwards compatibility methods
  //   send(payload, callback) {
  //     if (typeof payload === "string") {
  //       // Legacy send(method, params)
  //       return this.request({ method: payload, params: callback || [] });
  //     }

  //     if (callback) {
  //       // Legacy send(payload, callback)
  //       this.request(payload)
  //         .then((result) => callback(null, { result }))
  //         .catch((error) => callback(error, null));
  //     } else {
  //       // Legacy send(payload) - return Promise
  //       return this.request(payload);
  //     }
  //   }

  //   sendAsync(payload, callback) {
  //     this.request(payload)
  //       .then((result) => callback(null, { result }))
  //       .catch((error) => callback(error, null));
  //   }
  // }

  // Create provider instance
  // const provider = new OpenLVProvider();
  const provider = createProvider({
    foo: 'bar',
  });

  // Expose provider globally
  window.openlv = provider;

  // For backwards compatibility, also expose as window.ethereum if not already set
  if (!window.ethereum) {
    window.ethereum = provider;
  }

  // EIP-6963 Provider Info
  const providerInfo = {
    uuid: crypto.randomUUID(),
    name: "Open Lavatory",
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle fill="%23663399" cx="16" cy="16" r="16"/><text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">OL</text></svg>',
    rdns: "io.openlv.wallet",
  };

  // EIP-6963 Provider Detail
  const providerDetail = Object.freeze({
    info: providerInfo,
    provider: provider,
  });

  // Announce provider
  function announceProvider() {
    const event = new CustomEvent("eip6963:announceProvider", {
      detail: providerDetail,
    });

    window.dispatchEvent(event);
  }

  // Listen for provider requests
  window.addEventListener("eip6963:requestProvider", announceProvider);

  // Announce immediately
  announceProvider();

  console.log(
    "OpenLV EIP-6963 Provider announced with RDNS:",
    providerInfo.rdns,
  );
})();
