---
title: openlv Wallet-Dapp Session Transport
description: A wire protocol for establishing wallet-dapp sessions and transporting EIP-1193 messages.
author: TBD
discussions-to: TBD
status: Draft
type: Standards Track
category: ERC
created: 2026-04-29
requires: 1193
---

## Abstract

This specification defines `open-lavatory`, hereafter `openlv`, an
Ethereum wallet-dapp wire protocol for session establishment and
transport of EIP-1193 request and response messages. `openlv`
standardizes a bootstrap URI, encrypted signaling frames, transport
negotiation carriage, a correlated session message envelope, and an
optional session resumption model.

## Motivation

Ethereum wallet connectivity should not require dependence on a single
hosted relay service, account portal, API key, or billing relationship.
Existing connection flows are widely deployed, but often tie session
establishment to centralized infrastructure in ways that reduce
portability and user autonomy.

`openlv` preserves the familiar wallet-pairing model while allowing
wallets and dapps to exchange standard EIP-1193 messages over
user-chosen relay infrastructure and a direct peer transport.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in [RFC
2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC
8174](https://www.rfc-editor.org/rfc/rfc8174).

### Roles

- **Host**: the peer that creates the session URI. In common
  deployments, the dapp.
- **Client**: the peer that joins using the session URI. In common
  deployments, the wallet.

### Bootstrap Transfer

Session establishment begins with out-of-band transfer of a session URI
from host to client.

Desktop implementations MUST support copy-paste of the `openlv://` URI.
Mobile implementations SHOULD support QR scanning, deep-link handling,
or both.

### Session URI

The version 1 session URI format is:

```text
openlv://<sessionId>@1?h=<h>&k=<k>&p=<p>&s=<s>
```

All fields are REQUIRED for deterministic interoperability.

- `sessionId`: 16 URL-safe characters matching
  `^[A-Za-z0-9_-]{16}$`
- `h`: 16 lowercase hexadecimal characters matching `^[0-9a-f]{16}$`
- `k`: 32 lowercase hexadecimal characters matching `^[0-9a-f]{32}$`
- `p`: signaling protocol identifier
- `s`: signaling server locator

At the protocol level, `p` and `s` are REQUIRED. Implementations MAY
expose local defaults, but interoperable peers MUST NOT assume them.

In version 1, `h` is derived by serializing the host encryption public
key as a string, hashing the bytes with SHA-256, lower-hex encoding the
digest, and truncating to the first 16 hexadecimal characters.

In version 1, `k` is imported as symmetric handshake key material from
the literal UTF-8 bytes of the 32-character string.

### Relay Model

Peers MUST connect to a shared relay namespace derived from
`sessionId`. The relay is untrusted and is used only for encrypted
signaling messages and transport negotiation payloads.

This specification does not mandate a single relay protocol. A
conforming relay MUST carry byte-equivalent text payloads between peers
within a shared namespace.

### Signaling Frame Format

Each signaling frame is serialized as:

```text
<prefix><recipient><ciphertext>
```

- `prefix`: one ASCII character identifying the encryption mode
- `recipient`: one ASCII character identifying the intended role
- `ciphertext`: base64 text of the encrypted JSON payload

Version 1 defines:

- `h`: handshake-key encrypted frame
- `x`: peer-key encrypted frame
- `h`: host recipient
- `c`: client recipient

Receivers MUST ignore frames where `recipient` does not match the local
role.

### Signaling Messages

After decryption, a signaling payload MUST be valid JSON containing:

- `type`
- `payload`
- `timestamp`

Version 1 defines the following signaling message types:

- `flash`
- `pubkey`
- `ack`
- `data`

`pubkey.payload.publicKey` MUST contain the sender public key
serialization used by the active peer-encryption scheme. `pubkey`
payloads MAY include descriptive metadata.

### Handshake Sequence

The version 1 handshake sequence is:

1. The client sends `flash` to the host using an `h` frame.
2. The host sends `pubkey` to the client using an `h` frame.
3. The client records the host public key and sends `pubkey` to the host
   using an `x` frame.
4. The host records the client public key and sends `ack` to the client
   using an `x` frame.
5. The client sends `ack` to the host using an `x` frame.
6. Both peers treat subsequent signaling data as peer-encrypted.

After the handshake, signaling application payloads MUST be carried in
`data` messages inside `x` frames.

### Cryptographic Behavior

Version 1 cryptographic behavior is normative for version 1
interoperability.

Handshake encryption uses AES-GCM with a fresh 12-byte random IV per
message. The serialized encrypted payload is:

```text
base64(iv || ciphertext)
```

Peer-encrypted frames use NaCl box-compatible authenticated encryption,
with an ephemeral sender key per message. The serialized encrypted
payload is:

```text
base64(ephemeralPublicKey || nonce || ciphertext)
```

Future revisions SHOULD define explicit cryptographic suite negotiation.

### Transport Negotiation

After peer key exchange, peers negotiate a direct transport through the
peer-encrypted signaling channel.

Version 1 standardizes carriage of WebRTC negotiation payloads as
signaling `data` messages whose payload is one of:

```json
{ "type": "offer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "answer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "candidate", "payload": "<candidate-json-string>" }
```

### Session Envelope

Application messages exchanged between peers use the following envelope:

```json
{ "type": "request", "messageId": "<id>", "payload": {} }
```

```json
{ "type": "response", "messageId": "<id>", "payload": {} }
```

`messageId` MUST uniquely identify a request within the active session.
A `response.messageId` MUST match a prior request.

### EIP-1193 Transport

`openlv` transports EIP-1193 messages as the `payload` field of the
session envelope.

Example request:

```json
{
  "type": "request",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {
    "method": "eth_requestAccounts",
    "params": []
  }
}
```

Example response:

```json
{
  "type": "response",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": [
    "0x1234567890abcdef1234567890abcdef12345678"
  ]
}
```

This specification does not redefine EIP-1193 semantics.

### Session Resumption

Wallets and dapps MAY persist session state locally to support later
resumption.

Persisted state MAY include `sessionId`, `p`, `s`, `k`, local key
material, peer public key, and transport configuration.

Resumption in version 1 means re-invoking communication using prior
local session material. It does not guarantee transport continuity.
Implementations MAY need to reconnect to the relay, re-establish
peer-encrypted signaling, and renegotiate transport.

## Rationale

The protocol uses an out-of-band URI because it is easy to transfer,
inspect, and encode in both desktop and mobile wallet flows. It uses
relays only for bootstrap and negotiation so ordinary wallet-dapp
traffic does not remain dependent on relay infrastructure. It carries
EIP-1193 messages unchanged to preserve compatibility with existing
Ethereum wallet and dapp interfaces.

The specification requires explicit `p` and `s` fields so
interoperability does not depend on hidden assumptions about a default
relay provider.

## Backwards Compatibility

This is a new protocol and does not change existing EIP-1193 semantics.
Wallets and dapps that do not implement `openlv` remain unaffected.

Version 1 compatibility depends on the `openlv://` URI shape, URI
version `@1`, the `sessionId`/`h`/`k` constraints, signaling frame
markers, signaling message types, and the session envelope.

## Test Cases

Version 1 test vectors SHOULD cover:

- URI encode/decode round-trips
- signaling frame parsing for `h` and `x`
- handshake transcript validation
- encrypted envelope round-trips
- WebRTC offer, answer, and candidate carriage
- request/response correlation by `messageId`

## Reference Implementation

The `open-lavatory` codebase is the reference implementation for this
draft. The current implementation of version 1 behavior is in
`packages/*/src`, including:

- `packages/core/src/url/index.ts`
- `packages/core/src/session.ts`
- `packages/signaling/src/base.ts`
- `packages/session/src/base.ts`
- `packages/transport/src/webrtc/index.ts`

## Security Considerations

The session URI contains sensitive bootstrap material and MUST be
handled as a secret until the handshake completes. Implementations MUST
use fresh randomness for IVs, nonces, ephemeral keys, and generated
session identifiers.

Relays are untrusted and can observe metadata such as timing, size, and
namespace. Implementations SHOULD validate decrypted JSON structure and
expected message types before acting on payloads. Implementations SHOULD
apply request timeouts and resource limits. Replay protection is not
fully standardized in version 1 and SHOULD be improved in future
revisions.

Persisted session state is sensitive and SHOULD be stored using the
strongest platform protections available. Implementations SHOULD allow
users to disconnect and delete saved session state.

## Copyright

Copyright and related rights waived via [CC0](../LICENSE.md).
