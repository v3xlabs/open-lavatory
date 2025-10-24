# OpenLV Browser Extension

A cross-browser extension that provides seamless OpenLV wallet connectivity for web applications. Built using [WXT](https://wxt.dev/) for maximum compatibility.

## 🌟 Features

- **🔗 Automatic Provider Injection**: Seamlessly injects `window.openlv` into web pages
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
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Page      │    │ Content Script  │    │ Background      │
│                 │    │                 │    │ Service Worker  │
│ window.openlv   │◄──►│ Message Bridge  │◄──►│ OpenLV Manager  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                                              ▲
         │                                              │
         ▼                                              ▼
┌─────────────────┐                        ┌─────────────────┐
│ Injected Script │                        │ Popup Interface │
│ (Provider API)  │                        │ (User Controls) │
└─────────────────┘                        └─────────────────┘
```

### Components

- **Background Script**: Manages OpenLV connections using the transport layer
- **Content Script**: Bridges communication between web pages and the extension
- **Injected Script**: Provides the `window.openlv` API to web applications
- **Popup Interface**: User-friendly UI for managing connections and viewing status

## 📋 API Reference

The extension injects a `window.openlv` object with the following API:

```javascript
// Initialize a new connection (dApp side)
const { openLVUrl, connectionId } = await window.openlv.initConnection();

// Connect to existing session (wallet side)
await window.openlv.connectToSession(openLVUrl);

// Send JSON-RPC messages
await window.openlv.sendMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'eth_requestAccounts',
  params: []
});

// Listen for events
window.openlv.onPhaseChange((phase) => {
  console.log('Connection phase:', phase.state);
});

window.openlv.onMessage((message) => {
  console.log('Received message:', message);
});

window.openlv.onError((error) => {
  console.error('Connection error:', error);
});

// Disconnect
await window.openlv.disconnect();
```

## 🔒 Security

- All communication is end-to-end encrypted using ECDH P-256 + AES-256-GCM
- No sensitive data is stored in extension storage
- Connections are isolated per tab for security
- Content Security Policy prevents script injection attacks

## 🌐 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Manifest V3 |
| Edge | ✅ Full | Manifest V3 |
| Opera | ✅ Full | Manifest V3 |
| Firefox | ✅ Full | Manifest V2 (auto-converted) |
| Safari | ⚠️ Limited | Not tested |

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**: Check console for errors, ensure all dependencies are built
2. **Connection timeouts**: Verify MQTT broker connectivity and firewall settings
3. **WebRTC failures**: May require TURN servers in restrictive network environments

### Debug Mode

Enable debug logging by setting `DEBUG=true` in the extension options or console:

```javascript
// In browser console
localStorage.setItem('openlv-debug', 'true');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Chrome and Firefox
5. Submit a pull request

## 📄 License

Part of the Open Lavatory Protocol - see main repository for license details.
