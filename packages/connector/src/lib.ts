import { createConnector } from "@wagmi/core";
import type { Connector } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";
import type { Address, ProviderConnectInfo } from "viem";
import { getAddress } from "viem";
import type { OpenLVModalElement as OpenLVModalElementType } from "./modal-component.js";
import { OPENLV_ICON_128 } from "./icons/logo.js";

import { OpenLVProvider } from "@openlv/transport/provider";

let OpenLVModalElement: typeof OpenLVModalElementType | undefined;

// Import fix to workaround SSR environments
(async () => {
  if (typeof window !== "undefined") {
    const { OpenLVModalElement: OpenLVModalElement_ } = await import("./modal-component.js");

    OpenLVModalElement = OpenLVModalElement_;
  }
})().then(() => {
  // console.log("OpenLV: Modal element imported");
});

export interface OpenLVParameters {
  showQrModal?: boolean;
}

type OpenLVConnector = Connector & {
  onDisplayUri(uri: string): void;
};

openlv.type = "openLv" as const;

function validateAndCleanAccounts(accounts: string[]): Address[] {
  return accounts
    .filter((addr: string) => {
      if (typeof addr !== "string") {
        console.warn("OpenLV: Skipping non-string address:", addr);
        return false;
      }
      if (!addr.startsWith("0x")) {
        console.warn("OpenLV: Skipping address without 0x prefix:", addr);
        return false;
      }
      if (addr.length !== 42) {
        console.warn(
          "OpenLV: Skipping address with wrong length:",
          addr,
          "Length:",
          addr.length
        );
        return false;
      }
      // Basic hex validation
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        console.warn(
          "OpenLV: Skipping address with invalid hex characters:",
          addr
        );
        return false;
      }
      return true;
    })
    .map((addr: string) => {
      try {
        return getAddress(addr);
      } catch (error) {
        console.warn(
          "OpenLV: Failed to validate address checksum:",
          addr,
          error
        );
        // Try to fix common checksum issues by converting to lowercase and then proper checksum
        try {
          return getAddress(addr.toLowerCase());
        } catch (error2) {
          console.error("OpenLV: Could not fix address:", addr, error2);
          throw error2;
        }
      }
    });
}

export function openlv(parameters: OpenLVParameters = {}) {
  const showQrModal = parameters.showQrModal ?? true;

  type Provider = OpenLVProvider;
  type Properties = {
    connect(parameters?: {
      chainId?: number | undefined;
      isReconnecting?: boolean | undefined;
    }): Promise<{ accounts: readonly Address[]; chainId: number }>;
    onConnect(connectInfo: ProviderConnectInfo): void;
    onDisplayUri(uri: string): void;
  };

  let provider_: Provider | undefined;
  let accounts: readonly Address[] = [];
  let currentChainId: number = mainnet.id;
  let isConnected = false;

  let connect: OpenLVConnector["onConnect"] | undefined;
  let displayUri: OpenLVConnector["onDisplayUri"] | undefined;
  let disconnect: OpenLVConnector["onDisconnect"] | undefined;
  let accountsChanged: OpenLVConnector["onAccountsChanged"] | undefined;
  let chainChanged: OpenLVConnector["onChainChanged"] | undefined;

  // Modal state
  let modalElement: OpenLVModalElementType | null = null;

  return createConnector<Provider, Properties>((config) => ({
    id: "openLv",
    name: "Open Lavatory",
    type: openlv.type,
    icon: OPENLV_ICON_128,

    async setup() {
      const provider = await this.getProvider().catch(() => null);
      if (!provider) return;

      if (!connect) {
        connect = this.onConnect.bind(this);
        provider.on("connect", connect);
      }
    },

    async connect({ chainId, isReconnecting } = {}) {
      try {
        const provider = await this.getProvider();

        if (!displayUri) {
          displayUri = this.onDisplayUri.bind(this);
          provider.on("display_uri", displayUri);
        }

        // Determine target chain
        let targetChainId = chainId;
        if (!targetChainId) {
          const state = (await config.storage?.getItem("state")) ?? {};
          const isChainSupported = config.chains.some(
            (x) => x.id === state.chainId
          );
          if (isChainSupported) targetChainId = state.chainId;
          else targetChainId = config.chains[0]?.id;
        }

        if (!targetChainId) throw new Error("No chains found on connector.");

        // Initialize OpenLV connection if not reconnecting or not connected
        if (!isReconnecting || !provider.connected) {
          await provider.init();
        }

        // Wait for wallet connection and proper connection state
        const result = await new Promise<{
          accounts: readonly Address[];
          chainId: number;
        }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout after 60 seconds"));
            cleanup();
          }, 60000);

          const cleanup = () => {
            clearTimeout(timeout);
            provider.removeListener("message", handleMessage);
            provider.removeListener("connect", handleConnect);
            if (displayUri) {
              provider.removeListener("display_uri", displayUri);
              displayUri = undefined;
            }
          };

          let connectionEstablished = false;
          let accountsRequested = false;

          const handleConnect = () => {
            connectionEstablished = true;
            console.log(
              "OpenLV: Connection established, requesting accounts..."
            );

            // Only request accounts once we have a proper connection
            if (!accountsRequested) {
              accountsRequested = true;
              setTimeout(async () => {
                try {
                  await provider.request({
                    method: "eth_requestAccounts",
                    params: undefined,
                  });
                } catch (error) {
                  console.error("Failed to request accounts:", error);
                  cleanup();
                  reject(error);
                }
              }, 1000); // Give a bit more time for the connection to stabilize
            }
          };

          const handleMessage = (message: any) => {
            console.log("OpenLV: Received message:", message);
            console.log("OpenLV: Message analysis:", {
              hasMethod: !!message.method,
              method: message.method,
              hasResult: !!message.result,
              resultType: Array.isArray(message.result)
                ? "array"
                : typeof message.result,
              resultLength: Array.isArray(message.result)
                ? message.result.length
                : "N/A",
              hasParams: !!message.params,
              hasId: !!message.id,
            });

            // Handle account response - look for proper JSON-RPC response with account data
            const isAccountMessage =
              (!message.method &&
                message.result &&
                Array.isArray(message.result) &&
                message.result.length > 0) ||
              (message.method === "eth_accounts" &&
                message.result?.length > 0) ||
              (message.method === "eth_accounts" &&
                Array.isArray(message.params) &&
                message.params.length > 0);

            if (isAccountMessage) {
              // Extract accounts from various possible formats
              let accountsArray: string[] = [];

              if (message.result && Array.isArray(message.result)) {
                accountsArray = message.result;
              } else if (message.params && Array.isArray(message.params)) {
                accountsArray = message.params;
              }

              console.log("OpenLV: Extracted accounts array:", accountsArray);

              // Validate and clean addresses
              try {
                const validAccounts = validateAndCleanAccounts(accountsArray);

                if (validAccounts.length > 0) {
                  cleanup();

                  accounts = validAccounts;
                  currentChainId = targetChainId!;
                  isConnected = true;

                  console.log(
                    "OpenLV: Connection successful, accounts:",
                    validAccounts
                  );
                  console.log(
                    "OpenLV: Updated global accounts variable:",
                    accounts
                  );
                  closeOpenLVModal();

                  // Emit connect event to Wagmi
                  config.emitter.emit("connect", {
                    accounts: validAccounts,
                    chainId: targetChainId!,
                  });

                  // Also trigger accountsChanged to ensure UI updates
                  setTimeout(() => {
                    if (accountsChanged) {
                      console.log(
                        "OpenLV: Triggering accountsChanged with:",
                        accountsArray
                      );
                      accountsChanged(accountsArray);
                    }
                  }, 100);

                  resolve({
                    accounts: validAccounts,
                    chainId: targetChainId!,
                  });
                  return;
                } else {
                  console.log(
                    "OpenLV: No valid addresses found after validation"
                  );
                  console.log(
                    "OpenLV: Continuing to wait for valid addresses..."
                  );
                }
              } catch (error) {
                console.error("OpenLV: Address validation failed:", error);
                console.log(
                  "OpenLV: Continuing to wait for valid addresses..."
                );
                // Continue waiting for valid addresses
              }
            }

            // Handle other responses that might contain account info (fallback)
            if (
              message.result &&
              Array.isArray(message.result) &&
              message.result.length > 0
            ) {
              // Check if this looks like an account array
              const firstItem = message.result[0];
              if (
                typeof firstItem === "string" &&
                firstItem.startsWith("0x") &&
                firstItem.length === 42
              ) {
                try {
                  const validAccounts = validateAndCleanAccounts(
                    message.result
                  );

                  if (validAccounts.length > 0) {
                    cleanup();

                    accounts = validAccounts;
                    currentChainId = targetChainId!;
                    isConnected = true;

                    console.log(
                      "OpenLV: Connection successful (fallback), accounts:",
                      validAccounts
                    );
                    closeOpenLVModal();

                    // Emit connect event to Wagmi
                    config.emitter.emit("connect", {
                      accounts: validAccounts,
                      chainId: targetChainId!,
                    });

                    // Also trigger accountsChanged to ensure UI updates
                    setTimeout(() => {
                      if (accountsChanged) {
                        accountsChanged(message.result);
                      }
                    }, 100);

                    resolve({
                      accounts: validAccounts,
                      chainId: targetChainId!,
                    });
                  }
                } catch (error) {
                  console.error(
                    "OpenLV: Fallback address validation failed:",
                    error
                  );
                  // Continue waiting
                }
              }
            }
          };

          provider.on("message", handleMessage);
          provider.on("connect", handleConnect);

          // Add debug listener to see all messages
          provider.on("message", (msg) => {
            console.log("OpenLV: Provider emitted message event:", msg);
          });

          // If already connected, trigger the connect handler
          if (provider.connected) {
            handleConnect();
          }
        });

        // Set up event listeners for ongoing communication
        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this);
          provider.on("accountsChanged", accountsChanged);
          console.log("OpenLV: Set up accountsChanged listener");
        }

        // Also set up a direct listener for immediate account updates
        const directAccountHandler = (newAccounts: string[]) => {
          console.log("OpenLV: Direct account update received:", newAccounts);
          if (newAccounts.length > 0) {
            const addresses = newAccounts.map((addr) => getAddress(addr));
            accounts = addresses;
            isConnected = true;

            // Emit change event to update Wagmi UI
            config.emitter.emit("change", { accounts: addresses });
            console.log(
              "OpenLV: Emitted change event with accounts:",
              addresses
            );
          }
        };
        provider.on("accountsChanged", directAccountHandler);

        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this);
          provider.on("chainChanged", chainChanged);
          console.log("OpenLV: Set up chainChanged listener");
        }

        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this);
          provider.on("disconnect", disconnect);
          console.log("OpenLV: Set up disconnect listener");
        }

        return result;
      } catch (error) {
        console.error("OpenLV connection failed:", error);
        closeOpenLVModal();
        throw error;
      }
    },

    async disconnect() {
      const provider = await this.getProvider();

      try {
        provider?.disconnect();
      } catch (error) {
        console.error("Disconnect error:", error);
      } finally {
        // Clean up event listeners
        if (accountsChanged) {
          provider?.removeListener("accountsChanged", accountsChanged);
          accountsChanged = undefined;
        }
        if (chainChanged) {
          provider?.removeListener("chainChanged", chainChanged);
          chainChanged = undefined;
        }
        if (disconnect) {
          provider?.removeListener("disconnect", disconnect);
          disconnect = undefined;
        }

        accounts = [];
        isConnected = false;
        currentChainId = mainnet.id;
        provider_ = undefined;
        closeOpenLVModal();
      }
    },

    async getAccounts() {
      console.log("OpenLV: getAccounts called, returning:", accounts);
      return accounts;
    },

    async getProvider() {
      if (!provider_) {
        provider_ = new OpenLVProvider();
      }
      return provider_;
    },

    async getChainId() {
      return currentChainId;
    },

    async isAuthorized() {
      try {
        const authorized = isConnected && accounts.length > 0;
        console.log("OpenLV: isAuthorized check:", {
          isConnected,
          accountsLength: accounts.length,
          authorized,
        });
        return authorized;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId: newChainId }: { chainId: number }) {
      const chain = config.chains.find((x) => x.id === newChainId);
      if (!chain) throw new Error(`Chain ${newChainId} not configured`);

      const provider = await this.getProvider();
      if (!provider) throw new Error("Provider not connected");

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${newChainId.toString(16)}` }],
        });

        currentChainId = newChainId;
        config.emitter.emit("change", { chainId: newChainId });

        return chain;
      } catch (error) {
        throw new Error(`Failed to switch chain: ${error}`);
      }
    },

    onAccountsChanged(newAccounts: string[]) {
      console.log("OpenLV: Accounts changed:", newAccounts);

      if (newAccounts.length === 0) {
        this.onDisconnect();
      } else {
        const addresses = newAccounts.map((addr) => getAddress(addr));
        // Update internal state
        accounts = addresses;
        isConnected = true;

        config.emitter.emit("change", { accounts: addresses });
      }
    },

    onChainChanged(chainId: string | number) {
      const newChainId =
        typeof chainId === "string" ? parseInt(chainId, 16) : Number(chainId);
      currentChainId = newChainId;
      config.emitter.emit("change", { chainId: newChainId });
    },

    async onConnect(connectInfo?: ProviderConnectInfo) {
      const chainId = connectInfo?.chainId
        ? Number(connectInfo.chainId)
        : currentChainId;
      currentChainId = chainId;
      const currentAccounts = await this.getAccounts();
      config.emitter.emit("connect", { accounts: currentAccounts, chainId });
    },

    async onDisconnect() {
      accounts = [];
      isConnected = false;
      currentChainId = mainnet.id;
      config.emitter.emit("disconnect");
    },

    onDisplayUri(uri: string) {
      if (showQrModal) {
        showOpenLVModal(uri);
      }
      config.emitter.emit("message", { type: "display_uri", data: uri });
    },
  }));

  // Web Component Modal functions
  function showOpenLVModal(uri: string) {
    closeOpenLVModal();

    if (!OpenLVModalElement) {
      return;
    }

    modalElement = new OpenLVModalElement();
    modalElement.setProps(uri, closeOpenLVModal);
    document.body.appendChild(modalElement);
  }

  function closeOpenLVModal() {
    if (modalElement) {
      document.body.removeChild(modalElement);
      modalElement = null;
    }
  }
}
