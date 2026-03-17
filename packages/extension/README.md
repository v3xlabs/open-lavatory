# OpenLV Browser Extension

A cross-browser extension that provides seamless OpenLV wallet connectivity for web applications. Built using [WXT](https://wxt.dev/) for maximum compatibility.

## 🌟 Features

- **🔗 Automatic Provider Injection**: Seamlessly injects `window.ethereum` (EIP-1193) into web pages
- **🌐 Cross-Browser Support**: Works on Chrome, Firefox, Edge, Opera, and other browsers
- **🔒 Secure P2P Communication**: Handles encrypted peer-to-peer connections in the background
- **📱 User-Friendly Interface**: Clean popup UI for managing connections
- **⚡ Real-time Status**: Live connection status updates and phase tracking

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Development mode (auto-reload)
pnpm dev                # Chromium-based browsers
pnpm dev:firefox        # Firefox

# Build for production
pnpm build              # Chromium-based browsers
pnpm build:firefox      # Firefox

# Create distributable zip files
pnpm zip                # Chromium zip
pnpm zip:firefox        # Firefox zip
```

## 📦 Installation

### For Development

1. Build the extension: `pnpm build`
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `packages/extension/.output/chrome-mv3`

### For Firefox

1. Build for Firefox: `pnpm build:firefox`
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` from `packages/extension/.output/firefox-mv2`

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Page World (untrusted)                             │
│  Injected Script — thin EIP-1193 stub only          │
│  window.ethereum = { request, on, off }             │
└──────────────────┬──────────────────────────────────┘
                   │ postMessage (RPC request/response + events)
                   ▼
┌─────────────────────────────────────────────────────┐
│  Content Script (isolated JS world)                 │
│  Real provider: session, keys, storage live here    │
│  Unreachable from page JS                           │
└──────────────────┬──────────────────────────────────┘
                   │ chrome.runtime.sendMessage
                   ▼
┌─────────────────────────────────────────────────────┐
│  Background Service Worker                          │
│  Popup window orchestration                         │
└──────────────────┬──────────────────────────────────┘
                   │ chrome.runtime.onMessage
                   ▼
┌─────────────────────────────────────────────────────┐
│  Connect Popup (extension page)                     │
│  Modal UI, reads/writes chrome.storage directly     │
└─────────────────────────────────────────────────────┘
```

### Components

- **Background Script**: Orchestrates connect popup windows and relays cancel signals
- **Content Script**: Owns the real provider — session, encryption keys, and settings storage live here in an isolated JS world the page cannot reach
- **Injected Script**: Tiny `window.ethereum` stub that forwards EIP-1193 `request()` calls to the content script via `postMessage` and relays events back
- **Connect Popup**: Extension page that renders the modal UI; communicates with background via `chrome.runtime`

## 📋 API Reference

The extension injects an EIP-1193 provider at `window.ethereum` and announces
it via EIP-6963 (`eip6963:announceProvider`).

```javascript
// Request wallet connection
const accounts = await window.ethereum.request({
  method: "eth_requestAccounts",
});

// Standard RPC
const chainId = await window.ethereum.request({ method: "eth_chainId" });

// Events
const onAccountsChanged = (nextAccounts) => {
  console.log("accountsChanged", nextAccounts);
};

window.ethereum.on("accountsChanged", onAccountsChanged);

// Cleanup
window.ethereum.off("accountsChanged", onAccountsChanged);
```

## 🔒 Security

- All communication is end-to-end encrypted using ECDH P-256 + AES-256-GCM
- No sensitive data is stored in extension storage
- Connections are isolated per tab for security
- Content Security Policy prevents script injection attacks

## 🌐 Browser Compatibility

| Browser | Support    | Notes                        |
| ------- | ---------- | ---------------------------- |
| Chrome  | ✅ Full    | Manifest V3                  |
| Edge    | ✅ Full    | Manifest V3                  |
| Opera   | ✅ Full    | Manifest V3                  |
| Firefox | ✅ Full    | Manifest V2 (auto-converted) |
| Safari  | ⚠️ Limited | Not tested                   |

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**: Check console for errors, ensure all dependencies are built
2. **Connection timeouts**: Verify MQTT broker connectivity and firewall settings
3. **WebRTC failures**: May require TURN servers in restrictive network environments

### Debug Mode

Enable debug logging by setting `DEBUG=true` in the extension options or console:

```javascript
// In browser console
localStorage.setItem("openlv-debug", "true");
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Chrome and Firefox
5. Submit a pull request

## 📄 License

Part of the Open Lavatory Protocol - see main repository for license details.
