/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Background script for OpenLV Extension - EIP-6963 Compatible
// This script manages wallet operations and communicates with content scripts

// eslint-disable-next-line import/no-default-export
export default defineBackground(() => {
  console.log("OpenLV EIP-6963 Extension Background Script Started");

  // Store for managing wallet state
  interface WalletState {
    accounts: string[];
    chainId: string;
    isConnected: boolean;
    permissions: any[];
  }

  const walletState: WalletState = {
    accounts: [],
    chainId: "0x1", // Default to Ethereum mainnet
    isConnected: false,
    permissions: [],
  };

  // Connected tabs tracking
  const connectedTabs = new Set<number>();

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener(
    async (message: any, sender: any, sendResponse: any) => {
      try {
        console.log("Background received message:", message.type);

        switch (message.type) {
          case "eth_requestAccounts":
            return await handleRequestAccounts(message.data, sender.tab?.id);

          case "eth_getBalance":
            return await handleGetBalance(message.data);

          case "eth_sendTransaction":
            return await handleSendTransaction(message.data, sender.tab?.id);

          case "personal_sign":
            return await handlePersonalSign(message.data, sender.tab?.id);

          case "eth_sign":
            return await handleEthSign(message.data, sender.tab?.id);

          case "eth_signTypedData":
          case "eth_signTypedData_v3":
          case "eth_signTypedData_v4":
            return await handleSignTypedData(
              message.type,
              message.data,
              sender.tab?.id,
            );

          case "wallet_switchEthereumChain":
            return await handleSwitchChain(message.data, sender.tab?.id);

          case "wallet_addEthereumChain":
            return await handleAddChain(message.data, sender.tab?.id);

          case "wallet_getPermissions":
            return await handleGetPermissions(message.data);

          case "wallet_requestPermissions":
            return await handleRequestPermissions(message.data, sender.tab?.id);

          case "forward_request":
            return await handleForwardRequest(message.data);

          default:
            console.warn("Unknown message type:", message.type);

            return { success: false, error: "Unknown message type" };
        }
      } catch (error) {
        console.error("Background script error:", error);

        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  // Handler functions for EIP-1193 methods

  async function handleRequestAccounts(
    data: { tabId: number },
    tabId?: number,
  ) {
    console.log("Handling eth_requestAccounts");

    try {
      // In a real wallet, this would:
      // 1. Show user consent dialog
      // 2. Get user's approval
      // 3. Return the accounts

      // For demonstration, we'll simulate some accounts
      const mockAccounts = [
        "0x742d35Cc6635C0532925a3b8d47C0bA1bb9ffa95",
        "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      ];

      // Show a simple notification to simulate user interaction
      await showUserConsentDialog(
        "Connect Wallet",
        "Allow this site to access your wallet?",
      );

      walletState.accounts = mockAccounts;
      walletState.isConnected = true;

      if (tabId) {
        connectedTabs.add(tabId);

        // Notify the tab about the connection
        try {
          await browser.tabs.sendMessage(tabId, {
            type: "connect",
            data: { chainId: walletState.chainId },
          });
          await browser.tabs.sendMessage(tabId, {
            type: "accountsChanged",
            data: { accounts: walletState.accounts },
          });
        } catch (error) {
          console.warn("Failed to notify tab:", error);
        }
      }

      return {
        success: true,
        accounts: walletState.accounts,
      };
    } catch (error) {
      console.error("Failed to request accounts:", error);
      throw error;
    }
  }

  async function handleGetBalance(data: { address: string; blockTag: string }) {
    console.log("Handling eth_getBalance for:", data.address);

    // In a real wallet, this would query the blockchain
    // For demonstration, return a mock balance
    const mockBalance = "0x1bc16d674ec80000"; // 2 ETH in wei (hex)

    return {
      success: true,
      balance: mockBalance,
    };
  }

  async function handleSendTransaction(
    data: { transaction: any },
    _tabId?: number,
  ) {
    console.log("Handling eth_sendTransaction:", data.transaction);

    try {
      // In a real wallet, this would:
      // 1. Validate the transaction
      // 2. Show user confirmation dialog
      // 3. Sign and broadcast the transaction

      await showUserConsentDialog(
        "Confirm Transaction",
        `Send ${data.transaction.value || "0"} ETH to ${data.transaction.to}?`,
      );

      // Mock transaction hash
      const mockTxHash =
        "0x" +
        Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join("");

      return {
        success: true,
        hash: mockTxHash,
      };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  }

  async function handlePersonalSign(
    data: { message: string; address: string },
    _tabId?: number,
  ) {
    console.log("Handling personal_sign");

    try {
      await showUserConsentDialog(
        "Sign Message",
        `Sign this message?\n\n${data.message}`,
      );

      // Mock signature
      const mockSignature =
        "0x" +
        Array.from({ length: 130 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join("");

      return {
        success: true,
        signature: mockSignature,
      };
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw error;
    }
  }

  async function handleEthSign(
    data: { address: string; message: string },
    _tabId?: number,
  ) {
    console.log("Handling eth_sign");

    try {
      await showUserConsentDialog(
        "Sign Data",
        `Sign this data with ${data.address}?`,
      );

      // Mock signature
      const mockSignature =
        "0x" +
        Array.from({ length: 130 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join("");

      return {
        success: true,
        signature: mockSignature,
      };
    } catch (error) {
      console.error("Failed to sign data:", error);
      throw error;
    }
  }

  async function handleSignTypedData(
    method: string,
    _data: { params: any[] },
    _tabId?: number,
  ) {
    console.log("Handling", method);

    try {
      await showUserConsentDialog(
        "Sign Typed Data",
        "Sign this structured data?",
      );

      // Mock signature
      const mockSignature =
        "0x" +
        Array.from({ length: 130 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join("");

      return {
        success: true,
        signature: mockSignature,
      };
    } catch (error) {
      console.error("Failed to sign typed data:", error);
      throw error;
    }
  }

  async function handleSwitchChain(data: { chainId?: string },
    _tabId?: number
    ) {
    console.log("Handling wallet_switchEthereumChain to:", data.chainId);

    try {
      if (!data.chainId) {
        throw new Error("Chain ID is required");
      }

      await showUserConsentDialog(
        "Switch Network",
        `Switch to chain ${data.chainId}?`,
      );

      // const oldChainId = walletState.chainId;

      walletState.chainId = data.chainId;

      // Notify all connected tabs about chain change
      for (const tabId of connectedTabs) {
        try {
          await browser.tabs.sendMessage(tabId, {
            type: "chainChanged",
            data: { chainId: walletState.chainId },
          });
        } catch (error) {
          console.warn("Failed to notify tab about chain change:", error);
        }
      }

      return {
        success: true,
        chainId: walletState.chainId,
      };
    } catch (error) {
      console.error("Failed to switch chain:", error);
      throw error;
    }
  }

  async function handleAddChain(data: any,
    _tabId?: number
  ) {
    console.log("Handling wallet_addEthereumChain");

    try {
      await showUserConsentDialog(
        "Add Network",
        `Add new network ${data.chainName || "Unknown"}?`,
      );

      // In a real wallet, this would add the chain to the wallet's configuration
      return {
        success: true,
        message: "Chain added successfully",
      };
    } catch (error) {
      console.error("Failed to add chain:", error);
      throw error;
    }
  }

  async function handleGetPermissions(
    _data: { tabId: number }
  ) {
    console.log("Handling wallet_getPermissions");

    return {
      success: true,
      permissions: walletState.permissions,
    };
  }

  async function handleRequestPermissions(
    data: { permissions: any },
    _tabId?: number,
  ) {
    console.log("Handling wallet_requestPermissions");

    try {
      await showUserConsentDialog(
        "Grant Permissions",
        "Grant the requested permissions?",
      );

      // Mock permissions
      const grantedPermissions = data.permissions || [];

      walletState.permissions = [
        ...walletState.permissions,
        ...grantedPermissions,
      ];

      return {
        success: true,
        permissions: grantedPermissions,
      };
    } catch (error) {
      console.error("Failed to request permissions:", error);
      throw error;
    }
  }

  async function handleForwardRequest(data: { method: string; params: any[] }) {
    console.log("Handling forward_request:", data.method);

    // For unknown methods, return a mock response
    return {
      success: true,
      result: null,
    };
  }

  // Utility function to simulate user consent dialog
  async function showUserConsentDialog(
    title: string,
    message: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // In a real extension, this would show a proper UI
      // For demonstration, we'll just log and auto-approve after a delay
      console.log(`User Consent Required: ${title}\n${message}`);

      setTimeout(() => {
        console.log("User consent granted (auto-approved for demo)");
        resolve(true);
      }, 1000);
    });
  }

  // Handle tab removal
  browser.tabs.onRemoved.addListener((tabId) => {
    connectedTabs.delete(tabId);
  });

  console.log("OpenLV EIP-6963 Background Script Ready");
});
