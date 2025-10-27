# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Lavatory is a secure privacy-first protocol for establishing peer-to-peer JSON-RPC connectivity between decentralized applications (dApps) and cryptocurrency wallets. It serves as a drop-in replacement for WalletConnect v2, eliminating centralized relay servers by using WebRTC for direct peer-to-peer connections with public signaling servers for initial handshake.

## Repository Structure

This is a pnpm workspace with the following packages:

### Core Packages
- **`packages/transport/`** - Core implementation of the OpenLV transport layer (TypeScript)
- **`packages/connector/`** - Wagmi connector for dApp integration
- **`packages/extension/`** - Browser extension for dApp integration

### Examples
- **`examples/sandbox/`** - Interactive testing environment with debug features
- **`examples/wallet/`** - Sample wallet implementation for testing
- **`examples/dapp/`** - Wagmi-based dApp sandbox for end-to-end testing

### Additional
- **`tests/`** - Playwright end-to-end tests
- **`docs/`** - Vocs-based documentation site with comprehensive guides, API reference, and protocol specification

## Common Development Commands

### Running Development Servers
```bash
# Sandbox (testing environment)
pnpm sandbox                    # Opens on localhost:5173

# dApp + Sandbox (wagmi integration testing)
pnpm dapp                       # dApp on localhost:5173
pnpm sandbox                    # Sandbox on localhost:5174

# dApp + Wallet
pnpm dapp                       # dApp on localhost:5173
pnpm wallet                     # Wallet on localhost:5174

# Browser extension development
pnpm extension                  # Chrome extension
pnpm extension:firefox          # Firefox extension

# Documentation
pnpm dev:docs                   # Development server for docs
```

### Building
```bash
# Build core libraries (required before running other packages)
pnpm build:lib                  # Build @openlv/transport
pnpm build:connector            # Build @openlv/connector

# Build extension
pnpm build:extension            # Chrome extension
pnpm build:extension:firefox    # Firefox extension

# Build everything
pnpm build                  # Build lib, connector, and extension
pnpm build:docs                 # Build documentation
```

### Testing
```bash
# Run tests (uses Playwright)
pnpm test                       # Headless test run
pnpm test:ui                    # Interactive UI mode
pnpm test:headed                # Run with browser visible

# Extension-specific tests
pnpm test:extension             # Extension tests
pnpm test:extension:chromium    # Chrome-specific tests
pnpm test:extension:firefox     # Firefox-specific tests
```

### Linting
Individual packages have their own lint scripts. From package directories:
```bash
pnpm lint                       # Run ESLint
pnpm lint:fix                   # Auto-fix linting issues
```

## Architecture Notes

### Protocol Flow
1. **Key Generation**: Peer A (dApp) chooses protocol, server, and generates keypair
2. **URL Sharing**: Connection details shared via QR code or copy/paste
3. **Signaling**: Both peers connect to chosen signaling server (MQTT/Waku/Nostr)
4. **Handshake**: Hybrid encryption scheme securely exchanges keys
5. **WebRTC**: Asymmetric encryption negotiates direct P2P connection
6. **Communication**: Encrypted JSON-RPC over local-preferred WebRTC

### Key Security Features
- End-to-End Encryption: ECDH P-256 + AES-256-GCM
- No Central Authority: Direct peer-to-peer communication
- Fallback Mechanism: MQTT reopens on WebRTC failure
- Key Verification: SHA-256 public key hashing

### Development Dependencies
- **Runtime**: Node.js with pnpm package manager
- **Transport Layer**: Built with TypeScript, uses MQTT, EventEmitter3
- **Frontend**: React/Vite for examples, wagmi/viem for Ethereum integration
- **Testing**: Playwright for E2E tests
- **Browser Support**: Full Chromium support, Firefox requires TURN servers

### URL Format
```
openlv://<session-id>?h=<pubkey-hash>&k=<shared-key>&s=<pairing-server>&p=<protocol-type>
```

### Important Development Notes
- Always run `pnpm build:lib` before developing other packages that depend on transport
- The project includes comprehensive Playwright tests for both sandbox and extension workflows
- Extension development supports both Chrome and Firefox with different build targets
- The protocol specification is available at `docs/spec.md`
