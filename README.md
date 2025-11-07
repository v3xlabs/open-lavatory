<p align="center">
  <a href="https://openlv.sh">
    <picture>
      <source srcset="./docs/public/openlv_logo_dark.svg" media="(prefers-color-scheme: dark)">
      <img src="./docs/public/openlv_logo_light.svg" alt="Open Lavatory" width="auto" height="60">
    </picture>
  </a>
</p>

<p align="center">
  Secure peer-to-peer connectivity between dApps and wallets
</p>

<p align="center">
    <a href="https://openlv.sh"><img src="https://img.shields.io/badge/Documentation-openlv.sh-blue?style=flat" alt="Documentation: openlv.sh"></a>
    <a href="#"><img src="https://img.shields.io/badge/Status-Proof%20of%20Concept-orange?style=flat" alt="Status: Proof of Concept"></a>
    <a href="https://hackathon.web3privacy.info"><img src="https://img.shields.io/badge/Built%20at-W3PN%20Hacks%202025-green?style=flat" alt="Built at W3PN Hacks 2025"></a>
</p>

---

> [!IMPORTANT]
> You are currently viewing the **beta** version of the repository.
>
> [See the documentation](https://openlv.sh) for a live demo.

## Features

- Privacy-first, end-to-end encrypted, no metrics, no tracking
- No central dependency, rather a variety of [signaling layers](https://openlv.sh/api/signaling)
- Peer-to-peer transport via WebRTC (or other [transport layers](https://openlv.sh/api/transport))
- Reuse of existing infrastructure and p2p standards
- User control over connection & configuration

## Overview

A secure privacy-first protocol for establishing peer-to-peer JSON-RPC connectivity between decentralized applications (dApps) and cryptocurrency wallets.

Open Lavatory Protocol eliminates centralized relay servers by enabling direct peer-to-peer connections between decentralized applications (dApps) and cryptocurrency wallets. Using public signaling servers for initial handshake and WebRTC combined with asymmetric encryption, it prioritizes **privacy** and **self-sovereignty**.

## Documentation

[Head to the documentation](https://openlv.sh) to learn more about openlv.

## Repository Structure

This repository includes the following packages:

| Package                              | Description                                         |
| ------------------------------------ | --------------------------------------------------- |
| [@openlv/session](./packages/session) | a session represents a connection between dApp and wallet   |
| [@openlv/signaling](./packages/signaling) | Implementation of various signaling layers   |
| [@openlv/transport](./packages/transport) | Implementation of various transport layers   |
| [@openlv/provider](./packages/provider) | EIP-1193 compatible provider    |
| [@openlv/core](./packages/core) | shared types and utilities   |
| [@openlv/modal](./packages/modal) | preact modal for dApp connection management   |
| [@openlv/connector](./packages/connector) | Wagmi connector for dApp integration                |
| [WIP] [extension](./packages/extension) | Browser extension for improved dApp support              |

| Examples                             | Description                                         |
| ------------------------------------ | --------------------------------------------------- |
| [sandbox](./examples/sandbox)     | Interactive testing environment with debug features |
| [wallet](./examples/wallet)       | Sample wallet implementation for testing            |
| [dapp](./examples/dapp)           | Wagmi-based dApp sandbox for end-to-end testing     |
| [docs](./docs)           | Documentation includes a running wagmi demo     |

## Specification

> [!IMPORTANT]
> This specification was written during a hackathon, it has its flaws, and should be treated as a proof of concept.

You can find the entire specification in [spec.md](./docs/spec.md).

## Contributing

We accept contributions via pull requests. Please ensure to push changesets for your changes. Also see issues to comment on RFCs.

## Attribution

The initial proof of concept was built during 48 hours at [W3PN Hacks 2025](https://hackathon.web3privacy.info) in Berlin by [@talentlessguy](https://github.com/talentlessguy) & [@lucemans](https://github.com/lucemans) & [@nevvdev](https://github.com/nevvdev).
