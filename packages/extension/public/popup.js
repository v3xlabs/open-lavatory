// Popup script for OpenLV EIP-6963 Wallet Extension

document.addEventListener("DOMContentLoaded", async () => {
  console.log("OpenLV Wallet Popup Loaded");
  await initializeWallet();
});

// DOM elements
const loadingElement = document.getElementById("loading");
const walletContentElement = document.getElementById("wallet-content");
const networkNameElement = document.getElementById("network-name");
const accountsListElement = document.getElementById("accounts-list");
const connectionStatusElement = document.getElementById("connection-status");
const chainIdElement = document.getElementById("chain-id");
const connectedSitesElement = document.getElementById("connected-sites");
const connectBtn = document.getElementById("connect-btn");
const settingsBtn = document.getElementById("settings-btn");

// Wallet state
let walletState = {
  accounts: [],
  chainId: "0x1",
  isConnected: false,
  connectedSites: 0,
};

// Network configurations
const networks = {
  "0x1": { name: "Ethereum Mainnet", symbol: "ETH" },
  "0x5": { name: "Goerli Testnet", symbol: "ETH" },
  "0x89": { name: "Polygon Mainnet", symbol: "MATIC" },
  "0xa4b1": { name: "Arbitrum One", symbol: "ETH" },
  "0xa": { name: "Optimism", symbol: "ETH" },
};

// Initialize wallet popup
async function initializeWallet() {
  try {
    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get wallet state from background
    await loadWalletState();

    // Set up event listeners
    setupEventListeners();

    // Show wallet content
    loadingElement?.classList.add("hidden");
    walletContentElement?.classList.remove("hidden");

    // Update UI
    updateUI();
  } catch (_error) {
    showError("Failed to initialize wallet");
  }
}

// Load wallet state from background script
async function loadWalletState() {
  try {
    // In a real wallet, this would get the actual state
    // For demo purposes, we'll simulate some data
    walletState = {
      accounts: [
        "0x742d35Cc6635C0532925a3b8d47C0bA1bb9ffa95",
        "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      ],
      chainId: "0x1",
      isConnected: true,
      connectedSites: 2,
    };
  } catch (_error) {
  }
}

// Set up event listeners
function setupEventListeners() {
  connectBtn.addEventListener("click", handleConnect);
  settingsBtn.addEventListener("click", handleSettings);

  // Listen for messages from background script
  if (typeof browser !== "undefined") {
    browser.runtime.onMessage.addListener((message) => {
      handleBackgroundMessage(message);
    });
  }
}

// Handle connect button click
async function handleConnect() {
  try {
    connectBtn.disabled = true;
    connectBtn.innerHTML = "<span>⏳</span> Connecting...";

    if (walletState.isConnected) {
      // Disconnect
      await disconnectWallet();
    } else {
      // Connect
      await connectWallet();
    }

    updateUI();
  } catch (_error) {
    showError("Connection failed");
  } finally {
    connectBtn.disabled = false;
  }
}

// Handle settings button click
function handleSettings() {
  // In a real wallet, this would open settings
  alert("Settings functionality would be implemented here");
}

// Connect wallet
async function connectWallet() {
    // Simulate account connection
    walletState.isConnected = true;
    walletState.connectedSites += 1;

    console.log("Wallet connected");
}

// Disconnect wallet
async function disconnectWallet() {
    walletState.isConnected = false;
    walletState.connectedSites = Math.max(0, walletState.connectedSites - 1);

    console.log("Wallet disconnected");
}

// Handle messages from background script
function handleBackgroundMessage(message) {
  switch (message.type) {
    case "accountsChanged":
      walletState.accounts = message.data.accounts || [];
      updateAccountsList();
      break;

    case "chainChanged":
      walletState.chainId = message.data.chainId;
      updateNetworkInfo();
      break;

    case "connect":
      walletState.isConnected = true;
      updateConnectionStatus();
      break;

    case "disconnect":
      walletState.isConnected = false;
      updateConnectionStatus();
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

// Update the entire UI
function updateUI() {
  updateNetworkInfo();
  updateAccountsList();
  updateConnectionStatus();
  updateConnectButton();
}

// Update network information
function updateNetworkInfo() {
  const network = networks[walletState.chainId] || {
    name: "Unknown Network",
    symbol: "?",
  };

  networkNameElement.textContent = network.name;
  chainIdElement.textContent = walletState.chainId;
}

// Update accounts list
function updateAccountsList() {
  accountsListElement.innerHTML = "";

  if (walletState.accounts.length === 0) {
    accountsListElement.innerHTML =
      '<div style="text-align: center; color: #666; padding: 20px;">No accounts available</div>';

    return;
  }

  walletState.accounts.forEach((account, index) => {
    const accountItem = createAccountItem(account, index);

    accountsListElement.appendChild(accountItem);
  });
}

// Create account item element
function createAccountItem(address, _index) {
  const accountItem = document.createElement("div");

  accountItem.className = "account-item";

  const addressSpan = document.createElement("div");

  addressSpan.className = "account-address";
  addressSpan.textContent = formatAddress(address);
  addressSpan.title = address; // Show full address on hover

  const balanceSpan = document.createElement("div");

  balanceSpan.className = "account-balance";
  balanceSpan.textContent = "2.00 ETH"; // Mock balance

  accountItem.appendChild(addressSpan);
  accountItem.appendChild(balanceSpan);

  // Add click handler to copy address
  accountItem.addEventListener("click", () => {
    copyToClipboard(address);
    showToast("Address copied to clipboard");
  });

  return accountItem;
}

// Update connection status
function updateConnectionStatus() {
  const status = walletState.isConnected ? "Connected" : "Disconnected";
  const statusClass = walletState.isConnected
    ? "status-connected"
    : "status-disconnected";

  connectionStatusElement.textContent = status;
  connectionStatusElement.className = `info-value ${statusClass}`;

  connectedSitesElement.textContent = walletState.connectedSites.toString();
}

// Update connect button
function updateConnectButton() {
  if (walletState.isConnected) {
    connectBtn.innerHTML = "<span>🔌</span> Disconnect";
    connectBtn.classList.remove("btn-primary");
  } else {
    connectBtn.innerHTML = "<span>🔗</span> Connect";
    connectBtn.classList.add("btn-primary");
  }
}

// Utility functions

// Format Ethereum address for display
function formatAddress(address) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");

      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  } catch (_error) {
  }
}

// Show error message
function showError(message) {
  alert(message);
}

// Show toast notification
function showToast(message) {
  // Create toast element
  const toast = document.createElement("div");

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out;
  `;
  toast.textContent = message;

  // Add CSS animation
  const style = document.createElement("style");

  style.textContent = `
    @keyframes fadeInOut {
      0%, 100% { opacity: 0; }
      20%, 80% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Show toast
  document.body.appendChild(toast);

  // Remove after animation
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }

    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }, 2000);
}

// Debug function to test wallet functionality
function debugWallet() {
  console.log("Current wallet state:", walletState);
  console.log("Available networks:", networks);
}

// Expose debug function globally
window.debugWallet = debugWallet;
