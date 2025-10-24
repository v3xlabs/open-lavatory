/* eslint-disable sonarjs/cognitive-complexity */

import type { OpenLVModalElement as OpenLVModalElementType } from "@openlv/modal";
import { OpenLVProvider } from "@openlv/transport/provider";
import type { Connector } from "@wagmi/core";
import { createConnector } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";
import type { Address, ProviderConnectInfo } from "viem";
import { getAddress } from "viem";

import { OPENLV_ICON_128 } from "./icon";

type ModalModule = typeof import("@openlv/modal");

// Simple connection state tracking
let globalConnectionState = {
  state: "idle" as
    | "idle"
    | "initializing"
    | "connecting"
    | "qr-ready"
    | "connected"
    | "error"
    | "disconnected",
  uri: undefined as string | undefined,
  error: undefined as string | undefined,
  connectedAccount: undefined as string | undefined,
  chainId: undefined as number | undefined,
};

let modalModulePromise: Promise<ModalModule> | undefined;

async function loadModalModule(): Promise<ModalModule | undefined> {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (!modalModulePromise) {
    modalModulePromise = import("@openlv/modal").then((module) => {
      module.registerOpenLVModal();

      return module;
    });
  }

  try {
    return await modalModulePromise;
  } catch (error) {
    console.error("OpenLV: Failed to load modal module:", error);
    modalModulePromise = undefined;

    return undefined;
  }
}

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
          addr.length,
        );

        return false;
      }

      // Basic hex validation
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        console.warn(
          "OpenLV: Skipping address with invalid hex characters:",
          addr,
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
          error,
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
    connect<withCapabilities extends boolean = false>(parameters?: {
      chainId?: number | undefined;
      instantOnboarding?: boolean | undefined;
      isReconnecting?: boolean | undefined;
      withCapabilities?: withCapabilities | boolean | undefined;
    }): Promise<{
      accounts: withCapabilities extends true
        ? readonly { address: Address }[]
        : readonly Address[];
      chainId: number;
    }>;
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

  return createConnector<Provider, Properties>((config) => {
    // Helper function to start transport and wait for URI
    async function startTransportAndWaitForUri() {
      // Ensure provider is initialized
      if (!provider_) {
        provider_ = new OpenLVProvider();
      }

      if (!displayUri) {
        displayUri = (uri: string) => {
          console.log("OpenLV: Received URI from transport:", uri);

          // Update global state
          globalConnectionState = {
            ...globalConnectionState,
            state: "qr-ready",
            uri,
          };

          // Update the modal with the new URI and QR ready state
          if (modalElement) {
            modalElement.updateConnectionState(globalConnectionState);
          }

          // Emit the event for compatibility
          config.emitter.emit("message", { type: "display_uri", data: uri });
        };
        provider_.on("display_uri", displayUri);
      }

      // Update global state
      globalConnectionState = { ...globalConnectionState, state: "connecting" };

      // Update modal to connecting state
      if (modalElement) {
        modalElement.updateConnectionState(globalConnectionState);
      }

      console.log("OpenLV: Starting transport initialization...");
      // Initialize OpenLV connection
      await provider_.init();
      console.log("OpenLV: Transport initialization complete");
    }

    // Web Component Modal functions
    async function showOpenLVModal(uri: string) {
      const modalModule = await loadModalModule();

      if (!modalModule) {
        return;
      }

      closeOpenLVModal();
      const modalElementInstance = new modalModule.OpenLVModalElement();

      modalElementInstance.setProps(uri, closeOpenLVModal);
      document.body.appendChild(modalElementInstance);
      modalElement = modalElementInstance;
    }

    async function showOpenLVModalWithConnectionFlow() {
      const modalModule = await loadModalModule();

      if (!modalModule) {
        throw new Error("Failed to load modal module");
      }

      // Don't close existing modal, just show it
      if (!modalElement) {
        const modalElementInstance = new modalModule.OpenLVModalElement();

        modalElementInstance.setProps("", closeOpenLVModal);

        // Set up copy handler
        (modalElementInstance as any).onCopy = async (uri: string) => {
          try {
            await navigator.clipboard.writeText(uri);
          } catch (error) {
            console.warn("Failed to copy to clipboard:", error);
          }
        };

        document.body.appendChild(modalElementInstance);
        modalElement = modalElementInstance;
      }

      // Update modal with current state
      if (modalElement) {
        modalElement.updateConnectionState(globalConnectionState);
      }

      // Set up start connection handler
      if (modalElement) {
        (modalElement as any).onStartConnection = async () => {
          console.log("OpenLV: Start connection clicked");
          globalConnectionState = {
            ...globalConnectionState,
            state: "initializing",
          };

          if (modalElement) {
            modalElement.updateConnectionState(globalConnectionState);
          }

          try {
            await startTransportAndWaitForUri();
          } catch (error) {
            console.error("OpenLV: Connection start failed:", error);
            globalConnectionState = {
              ...globalConnectionState,
              state: "error",
              error:
                error instanceof Error ? error.message : "Connection failed",
            };

            if (modalElement) {
              modalElement.updateConnectionState(globalConnectionState);
            }
          }
        };

        (modalElement as any).onRetry = async () => {
          console.log("OpenLV: Retry connection clicked");
          globalConnectionState = {
            ...globalConnectionState,
            state: "initializing",
          };

          if (modalElement) {
            modalElement.updateConnectionState(globalConnectionState);
          }

          try {
            await startTransportAndWaitForUri();
          } catch (error) {
            console.error("OpenLV: Connection retry failed:", error);
            globalConnectionState = {
              ...globalConnectionState,
              state: "error",
              error:
                error instanceof Error ? error.message : "Connection failed",
            };

            if (modalElement) {
              modalElement.updateConnectionState(globalConnectionState);
            }
          }
        };
      }
    }

    function closeOpenLVModal() {
      if (modalElement) {
        document.body.removeChild(modalElement);
        modalElement = null;
      }
    }

    return {
      id: "openLv",
      name: "Open Lavatory",
      type: openlv.type,
      icon: OPENLV_ICON_128,
      rdns: "company.v3x.openlv",

      async setup() {
        provider_ = (await this.getProvider().catch(() => undefined)) as
          | Provider
          | undefined;

        if (!provider_) return;

        if (!connect) {
          connect = this.onConnect.bind(this);
          provider_.on("connect", connect);
        }
      },
      async connect<withCapabilities extends boolean = false>(parameters?: {
        chainId?: number;
        isReconnecting?: boolean;
        withCapabilities?: withCapabilities | boolean;
      }): Promise<{
        accounts: withCapabilities extends true
          ? readonly {
              address: Address;
              capabilities: Record<string, unknown>;
            }[]
          : readonly Address[];
        chainId: number;
      }> {
        const chainId = parameters?.chainId ?? config.chains[0]?.id;
        const isReconnecting = parameters?.isReconnecting ?? false;

        try {
          // Determine target chain
          let targetChainId = chainId;

          if (!targetChainId) {
            const state = (await config.storage?.getItem("state")) ?? {};
            const isChainSupported = config.chains.some(
              (x) => x.id === state.chainId,
            );

            if (isChainSupported) targetChainId = state.chainId!;
            else targetChainId = config.chains[0]?.id;
          }

          if (!targetChainId) throw new Error("No chains found on connector.");

          // Show modal with connection flow
          if (showQrModal && !isReconnecting) {
            await showOpenLVModalWithConnectionFlow();
          } else {
            // Initialize OpenLV connection if not reconnecting or not connected
            if (!isReconnecting || !provider_?.connected) {
              await provider_?.init();
            }
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
              provider_?.removeListener("message", handleMessage);
              provider_?.removeListener("connect", handleConnect);

              if (displayUri) {
                provider_?.removeListener("display_uri", displayUri);
                displayUri = undefined;
              }
            };

            let connectionEstablished = false;
            let accountsRequested = false;

            const handleConnect = () => {
              connectionEstablished = true;
              console.log(
                "OpenLV: Connection established, requesting accounts...",
                connectionEstablished,
              );

              // Only request accounts once we have a proper connection
              if (!accountsRequested) {
                accountsRequested = true;
                setTimeout(async () => {
                  try {
                    await provider_?.request({
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
                      validAccounts,
                    );
                    console.log(
                      "OpenLV: Updated global accounts variable:",
                      accounts,
                    );

                    // Update global state
                    globalConnectionState = {
                      ...globalConnectionState,
                      state: "connected",
                      connectedAccount: validAccounts[0],
                      chainId: targetChainId!,
                    };

                    // Update modal to connected state
                    if (modalElement) {
                      modalElement.updateConnectionState(globalConnectionState);
                    }

                    // Close modal after a short delay to show success state
                    setTimeout(() => {
                      closeOpenLVModal();
                    }, 2000);

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
                          accountsArray,
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
                      "OpenLV: No valid addresses found after validation",
                    );
                    console.log(
                      "OpenLV: Continuing to wait for valid addresses...",
                    );
                  }
                } catch (error) {
                  console.error("OpenLV: Address validation failed:", error);
                  console.log(
                    "OpenLV: Continuing to wait for valid addresses...",
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
                      message.result,
                    );

                    if (validAccounts.length > 0) {
                      cleanup();

                      accounts = validAccounts;
                      currentChainId = targetChainId!;
                      isConnected = true;

                      console.log(
                        "OpenLV: Connection successful (fallback), accounts:",
                        validAccounts,
                      );

                      // Update global state
                      globalConnectionState = {
                        ...globalConnectionState,
                        state: "connected",
                        connectedAccount: validAccounts[0],
                        chainId: targetChainId!,
                      };

                      // Update modal to connected state
                      if (modalElement) {
                        modalElement.updateConnectionState(
                          globalConnectionState,
                        );
                      }

                      // Close modal after a short delay to show success state
                      setTimeout(() => {
                        closeOpenLVModal();
                      }, 2000);

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
                      error,
                    );
                    // Continue waiting
                  }
                }
              }
            };

            provider_?.on("message", handleMessage);
            provider_?.on("connect", handleConnect);

            // Add debug listener to see all messages
            provider_?.on("message", (msg) => {
              console.log("OpenLV: Provider emitted message event:", msg);
            });

            // If already connected, trigger the connect handler
            if (provider_?.connected) {
              handleConnect();
            }
          });

          // Set up event listeners for ongoing communication
          if (!accountsChanged) {
            accountsChanged = this.onAccountsChanged.bind(this);
            provider_?.on("accountsChanged", accountsChanged);
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
                addresses,
              );
            }
          };

          provider_?.on("accountsChanged", directAccountHandler);

          if (!chainChanged) {
            chainChanged = this.onChainChanged.bind(this);
            provider_?.on("chainChanged", chainChanged);
            console.log("OpenLV: Set up chainChanged listener");
          }

          if (!disconnect) {
            disconnect = this.onDisconnect.bind(this);
            provider_?.on("disconnect", disconnect);
            console.log("OpenLV: Set up disconnect listener");
          }

          return result as {
            accounts: withCapabilities extends true
              ? readonly {
                  address: Address;
                  capabilities: Record<string, unknown>;
                }[]
              : readonly Address[];
            chainId: number;
          };
        } catch (error) {
          console.error("OpenLV connection failed:", error);
          closeOpenLVModal();
          throw error;
        }
      },
      async disconnect() {
        try {
          provider_?.disconnect();
        } catch (error) {
          console.error("Disconnect error:", error);
        } finally {
          // Clean up event listeners
          if (accountsChanged) {
            provider_?.removeListener("accountsChanged", accountsChanged);
            accountsChanged = undefined;
          }

          if (chainChanged) {
            provider_?.removeListener("chainChanged", chainChanged);
            chainChanged = undefined;
          }

          if (disconnect) {
            provider_?.removeListener("disconnect", disconnect);
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

        if (!provider_) throw new Error("Provider not connected");

        try {
          await provider_.request({
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

        // Update global state
        globalConnectionState = {
          ...globalConnectionState,
          state: "disconnected",
        };

        // Update modal if it exists
        if (modalElement) {
          modalElement.updateConnectionState(globalConnectionState);
        }

        config.emitter.emit("disconnect");
      },
      onDisplayUri(uri: string) {
        if (showQrModal) {
          showOpenLVModal(uri);
        }

        config.emitter.emit("message", { type: "display_uri", data: uri });
      },
    };
  });
}
