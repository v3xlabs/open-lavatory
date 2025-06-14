# Open Lavatory Protocol Specification v1.0

## Abstract

Open Lavatory is a decentralized, privacy-first protocol for establishing secure peer-to-peer connections between decentralized applications (dApps) and cryptocurrency wallets.
It serves as a drop-in replacement for WalletConnect, addressing the centralization issues introduced in WalletConnect v2 while maintaining compatibility with existing wallet standards such as [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) & [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193).

## 1. Introduction

### 1.1 Background

**WalletConnect v1** succeeded in providing a **dapp-decides-relay** solution for dApp-wallet communication, but WalletConnect v2 introduced significant centralization through a required relay server system.
Open Lavatory aims to address these issues using public signaling & existing p2p standards while improving security and privacy.

### 1.2 Design Goals

- **Peer-to-Peer**: Reliant on existing WebRTC & p2p standards
- **Privacy**: End-to-end encryption with only encrypted pairing data passing through signaling servers
- **Security**: Strong cryptographic protection and secure key exchange
- **Compatibility**: Drop-in replacement for existing wallet infrastructure via multi-injected provider discovery
- **Flexibility**: Support for multiple pairing server protocols (MQTT, Waku, Nostr, etc.)

## 2. Protocol Architecture

### 2.1 Overview

Open Lavatory establishes connections through a three-phase process:

1. **Discovery Phase**: dApp generates session credentials and presents connection URL
2. **Pairing Phase**: Wallet connects via public pairing server with encrypted communication
3. **Direct Connection Phase**: Peers establish WebRTC connection for ongoing communication

### 2.2 Connection Flow Diagram

The following diagram illustrates the complete connection establishment process:

```mermaid
sequenceDiagram
    participant dApp as dApp<br/>(Peer A)
    participant QR as QR Code<br/>Display  
    participant Wallet as Mobile Wallet<br/>(Peer B)
    participant MQTT as Pairing Server<br/>(MQTT/Waku/Nostr)
    participant WebRTC as WebRTC<br/>P2P Connection

    Note over dApp, WebRTC: Phase 1: Discovery & Session Initialization
    dApp->>dApp: Generate sessionId & sharedKey<br/>via crypto.randomUUID()
    dApp->>dApp: Derive AES-GCM key<br/>using PBKDF2
    dApp->>MQTT: Subscribe to topic<br/>/openlv/session/<sessionId>
    dApp->>QR: Display QR code<br/>openlv://sessionId?k=key
    
    Note over dApp, WebRTC: Phase 2: Pairing via Encrypted MQTT
    Wallet->>QR: Scan QR code
    Wallet->>Wallet: Parse openlv:// URL<br/>Extract sessionId & sharedKey
    Wallet->>Wallet: Derive same AES-GCM key<br/>using PBKDF2
    Wallet->>MQTT: Subscribe to same topic<br/>/openlv/session/<sessionId>
    
    Wallet->>MQTT: Send encrypted "hello" message<br/>with wallet info
    MQTT->>dApp: Relay encrypted message
    dApp->>dApp: Decrypt & verify message<br/>using shared key
    
    Note over dApp, WebRTC: Phase 3: WebRTC Handshake (Encrypted via MQTT)
    dApp->>WebRTC: Initialize RTCPeerConnection<br/>with STUN/TURN servers
    dApp->>MQTT: Send encrypted WebRTC offer<br/>SDP + ICE candidates
    MQTT->>Wallet: Relay encrypted offer
    Wallet->>Wallet: Decrypt offer & set remote description
    Wallet->>WebRTC: Initialize RTCPeerConnection<br/>Create answer
    Wallet->>MQTT: Send encrypted WebRTC answer<br/>SDP + ICE candidates  
    MQTT->>dApp: Relay encrypted answer
    dApp->>dApp: Decrypt answer & set remote description
    
    Note over dApp, WebRTC: ICE Candidate Exchange (Encrypted)
    dApp->>MQTT: Send encrypted ICE candidates
    MQTT->>Wallet: Relay candidates
    Wallet->>MQTT: Send encrypted ICE candidates
    MQTT->>dApp: Relay candidates
    
    Note over dApp, WebRTC: Phase 4: Direct P2P Communication
    WebRTC-->>WebRTC: DTLS-encrypted DataChannel established
    dApp->>WebRTC: Send Ethereum JSON-RPC requests<br/>eth_requestAccounts, eth_sendTransaction
    WebRTC->>Wallet: Direct P2P communication<br/>(bypassing MQTT)
    Wallet->>WebRTC: JSON-RPC responses<br/>account data, signed transactions
    WebRTC->>dApp: Receive responses
    
    Note over dApp, WebRTC: Fallback Mechanism
    alt WebRTC connection fails
        dApp->>MQTT: Continue using encrypted MQTT<br/>for JSON-RPC communication
        MQTT->>Wallet: Relay encrypted requests/responses
    end
    
    Note over dApp, WebRTC: EIP-6963 Integration
    dApp->>dApp: Expose OpenLavatoryProvider<br/>via window.ethereum events
    dApp->>dApp: Compatible with wagmi,<br/>ethers, web3.js
```

### 2.3 Components

- **dApp (Peer A)**: Web application requesting wallet connection
- **Wallet (Peer B)**: Mobile or desktop wallet application
- **Pairing Server**: Public, protocol-agnostic message relay (MQTT, Waku, Nostr, etc.)
- **Provider Interface**: EIP-6963 compatible provider for dApp integration

## 3. URL Format Specification

### 3.1 Standard Format

```
openlv://<session-id>?k=<shared-key>&s=<pairing-server>&p=<protocol-type>
```

### 3.2 Parameters

| Parameter | Required | Description | Format |
|-----------|----------|-------------|---------|
| `session-id` | Yes | Unique session identifier | UUID v4 |
| `k` | Yes | Pre-shared encryption key | Base64-encoded 256-bit key |
| `s` | No | Pairing server URL | URL-encoded string |
| `p` | No | Pairing server protocol | `mqtt`, `waku`, `nostr` |

### 3.3 Examples

```
openlv://550e8400-e29b-41d4-a716-446655440000?k=YWJjZGVmZ2hpams&s=wss%3A//test.mosquitto.org%3A8081/mqtt&p=mqtt

openlv://550e8400-e29b-41d4-a716-446655440000?k=YWJjZGVmZ2hpams
```

### 3.4 Default Values

- `server`: `wss://test.mosquitto.org:8081/mqtt` (fallback MQTT broker)
- `protocol`: `mqtt`

## 4. Cryptographic Specification

### 4.1 Key Derivation

Shared keys are derived using PBKDF2 with the following parameters:
- **Algorithm**: PBKDF2
- **Hash**: SHA-256
- **Iterations**: 100,000
- **Salt**: `openlv-salt` (UTF-8 encoded)
- **Output**: 256-bit AES-GCM key

### 4.2 Message Encryption

All messages transmitted via pairing servers are encrypted using:
- **Algorithm**: AES-GCM
- **Key Size**: 256 bits
- **IV Size**: 96 bits (randomly generated per message)
- **Tag Size**: 128 bits

### 4.3 Message Format

Encrypted messages are base64-encoded with the following structure:
```
base64(iv || encrypted_data || auth_tag)
```

## 5. Pairing Server Protocols

### 5.1 MQTT Protocol

- **Topic Format**: `/openlv/session/<session-id>`
- **QoS Level**: 1 (at least once delivery)
- **Retain**: False
- **Clean Session**: True

### 5.2 Waku Protocol (Future)

- **Content Topic**: `/openlv/1/session/<session-id>/proto`
- **Ephemeral**: True
- **Store**: False

### 5.3 Nostr Protocol (Future)

- **Event Kind**: 21000 (ephemeral)
- **Tags**: `["t", "openlv-<session-id>"]`

## 6. Message Types

### 6.1 Hello Message

Sent by wallet to initiate connection:

```json
{
  "type": "hello",
  "payload": {
    "walletInfo": {
      "name": "Example Wallet",
      "version": "1.0.0",
      "icon": "data:image/svg+xml;base64,..."
    }
  },
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sharedKey": "pre-shared-key",
  "timestamp": 1640995200
}
```

### 6.2 WebRTC Offer/Answer

Standard WebRTC SDP exchange:

```json
{
  "type": "webrtc-offer",
  "payload": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456 123456 IN IP4 0.0.0.0\r\n..."
  },
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sharedKey": "pre-shared-key",
  "timestamp": 1640995200
}
```

### 6.3 ICE Candidates

WebRTC ICE candidate exchange:

```json
{
  "type": "ice-candidate",
  "payload": {
    "candidate": "candidate:1 1 UDP 2013266431 192.168.1.100 54400 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  },
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sharedKey": "pre-shared-key",
  "timestamp": 1640995200
}
```

## 7. WebRTC Configuration

### 7.1 ICE Servers

Default STUN/TURN servers for maximum compatibility:

```javascript
{
  iceServers: [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
    
    // TURN servers (OpenRelay)
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}
```

### 7.2 Browser Support

Chromium appears to be working however Firefox appears to have problems when not provided with a TURN server.
