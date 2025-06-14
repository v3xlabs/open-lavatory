# open-lavatory

> [!NOTE]  
> This project was built during 48 hours at [W3PN Hacks 2025](https://hackathon.web3privacy.info) in Berlin. It is to be treated as a proof of concept.

A secure privacy-first protocol for establishing peer-to-peer JSON-RPC connectivity between decentralized applications (dApps) and cryptocurrency wallets.

This repository includes the following packages:

- [lib](./packages/lib): a basic implementation of the openlv transport layer
- [connector](./packages/connector): a wagmi connector to connect to dApps using openlv
- [sandbox](./packages/sandbox): a sandbox environment to test the openlv transport layer
- [wallet](./packages/wallet): a sample wallet implementation to test connecting
- [dapp](./packages/dapp): a wagmi dApp sandbox for testing the end-to-end flow

## Specification

> [!IMPORTANT]  
> This specification was written during a hackathon, it has its flaws, and should be treated as a proof of concept.

You can find the entire specification in [spec.md](./spec.md).

In short detail, the protocol works as follows:

1. Peer A (the dApp) chooses a protocol, server, and generate a keypair.
2. Peer A shares this information via URL (QR Code or Copy/Paste) with Peer B (the wallet).
3. Peer A & B both connect with the chosen signaling server.
4. A hybrid homo-to-asymmetric encryption scheme is used to perform a handshake and securely exchange keys.
5. Asymmetric encryption is used to negotiate webRTC connection.
6. Peer A & Peer B now securely communicate JSON-RPC requests via encrypted local-preferred webRTC.

### Known issues

As always there is room for improvement;

The current specification implements a full homo-to-asymmetric encryption scheme, which could be simplified (taking signaling server race conditions into account) to be more efficient and only rely on asymmetric encryption.

In a similar manner, the `h` parameter specifies a hash of the public key, which allows for double verification when initiating a handshake during the signaling phase. This too could use improvements.

#### Browser support

At the time of writing only chromium based browsers are supported.
This is due to the nature of webRTC, firefox poses an explicit requirement for TURN servers to be configured. Which unfortunately are where re-centralization could occur. Although this doesnt make usage impossible, complete free usage and local webRTC (with and without TURN) can be completed in chromium-based browsers.

## Testing it out

There are several ways to run this project

### Sandbox + Sandbox

To test out the openlv transport layer, you can run the sandbox and the wallet in two separate tabs. The sandbox includes debug logs, extra features and fully fledged UI.

```bash
pnpm sandbox
```

And then open [localhost:5173](http://localhost:5173) in two of your browser tabs.

### dApp + Sandbox

To test out the wagmi connector and explore the active connection you can initiate a session from the dApp sandbox.

The dApp sandbox aims to implement your average dApp, it includes basic wagmi UI, wrapper, and multi injected provider discovery.

```bash
pnpm dapp
pnpm sandbox
```

And then open [localhost:5173](http://localhost:5173) & [localhost:5174](http://localhost:5174) in your browser.

### dApp + Wallet

We have also written a sample wallet implementation that would emulate how a wallet would implement the openlv transport layer.

You can run this in conjunction with the dApp or the sandbox.

```bash
pnpm wallet
pnpm dapp
```

And then open [localhost:5173](http://localhost:5173) & [localhost:5174](http://localhost:5174) in your browser.

## Attribution

Built by [@talentlessguy](https://github.com/talentlessguy) & [@lucemans](https://github.com/lucemans) for [W3PN Hacks 2025](https://hackathon.web3privacy.info) in Berlin.
