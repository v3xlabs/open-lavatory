# Open Lavatory Protocol

<div align="center">
  <img src="./packages/dapp/public/openlavatory.png" alt="Open Lavatory Protocol" width="150" height="150">
  <br />
  <h2>🚀 A Privacy-First P2P Protocol for Web3</h2>
  <p><strong>Secure peer-to-peer JSON-RPC connectivity between dApps and wallets</strong></p>
  
  [![Built at W3PN Hacks 2025](https://img.shields.io/badge/Built%20at-W3PN%20Hacks%202025-blue?style=for-the-badge)](https://hackathon.web3privacy.info)
  [![Status](https://img.shields.io/badge/Status-Proof%20of%20Concept-orange?style=for-the-badge)](#)
</div>

---

## 🌟 Overview

> [!NOTE]  
> This project was built during 48 hours at [W3PN Hacks 2025](https://hackathon.web3privacy.info) in Berlin. It is to be treated as a proof of concept.

Open Lavatory Protocol eliminates centralized relay servers by enabling direct peer-to-peer connections between decentralized applications (dApps) and cryptocurrency wallets. Using public signaling servers for initial handshake and WebRTC for secure communication, it prioritizes **privacy** and **decentralization**.

## 📦 Repository Structure

This monorepo contains the following packages:

| Package | Description |
|---------|-------------|
| 🔧 [`lib`](./packages/lib) | Core implementation of the OpenLV transport layer |
| 🔌 [`connector`](./packages/connector) | Wagmi connector for dApp integration |
| 🧪 [`sandbox`](./packages/sandbox) | Interactive testing environment with debug features |
| 👛 [`wallet`](./packages/wallet) | Sample wallet implementation for testing |
| 🌐 [`dapp`](./packages/dapp) | Wagmi-based dApp sandbox for end-to-end testing |

## 🚀 Quick Start

### Option 1: Sandbox Testing (Recommended)
Test the transport layer with full debug capabilities:

```bash
pnpm sandbox
```

Open [localhost:5173](http://localhost:5173) in **two browser tabs** to simulate dApp ↔ wallet communication.

### Option 2: dApp + Sandbox
Experience the wagmi connector in action:

```bash
# Terminal 1
pnpm dapp

# Terminal 2  
pnpm sandbox
```

Navigate to:
- **dApp**: [localhost:5173](http://localhost:5173)
- **Sandbox**: [localhost:5174](http://localhost:5174)

### Option 3: dApp + Wallet
Full end-to-end wallet integration:

```bash
# Terminal 1
pnpm wallet

# Terminal 2
pnpm dapp
```

Navigate to:
- **Wallet**: [localhost:5173](http://localhost:5173)
- **dApp**: [localhost:5174](http://localhost:5174)

## 🔧 How It Works

<div align="center">
  <img src="https://via.placeholder.com/600x300/1a1a1a/ffffff?text=Protocol+Flow+Diagram" alt="Protocol Flow" width="600">
</div>

1. **🔑 Key Generation**: Peer A (dApp) generates ECDH keypair and session ID
2. **📱 URL Sharing**: Connection details shared via QR code or copy/paste  
3. **🤝 Signaling**: Both peers connect to chosen signaling server (MQTT/Waku/Nostr)
4. **🔐 Handshake**: Hybrid encryption scheme securely exchanges keys
5. **🌐 WebRTC**: Asymmetric encryption negotiates direct P2P connection
6. **💬 Communication**: Encrypted JSON-RPC over local-preferred WebRTC

## 📋 Specification

> [!IMPORTANT]  
> This specification was written during a hackathon and should be treated as a proof of concept.

📖 **Full specification**: [spec.md](./spec.md)

### 🔒 Security Features

- **🛡️ End-to-End Encryption**: ECDH P-256 + AES-256-GCM
- **🚫 No Central Authority**: Direct peer-to-peer communication
- **🔄 Fallback Mechanism**: MQTT reopens on WebRTC failure
- **✅ Key Verification**: SHA-256 public key hashing

### ⚠️ Known Limitations

#### Browser Support
- ✅ **Chromium-based browsers**: Full support with STUN servers
- ⚠️ **Firefox**: Requires TURN servers (potential centralization point)
- ❓ **Safari**: Limited testing

#### Technical Improvements Needed
- [ ] Simplify encryption scheme (remove homo-to-asymmetric complexity)
- [ ] Optimize public key hash verification (`h` parameter)
- [ ] Enhanced mobile browser support
- [ ] Better error handling and recovery

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## 🤝 Contributing

Built with ❤️ during a 48-hour hackathon. Contributions welcome!

## 👥 Attribution

**Builders**: [@talentlessguy](https://github.com/talentlessguy) & [@lucemans](https://github.com/lucemans)  
**Event**: [W3PN Hacks 2025](https://hackathon.web3privacy.info) in Berlin

---

<div align="center">
  <sub>🔒 Privacy-first • 🌐 Decentralized • 🚀 Built for Web3</sub>
</div>
