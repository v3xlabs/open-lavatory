# Open Lavatory Protocol Specification 002 (Revised)

## Abstract
Open Lavatory is a privacy-focused peer-to-peer wallet connectivity protocol for establishing JSON-RPC communication between a relying application and a wallet.

This specification defines a two-phase protocol:
1. **Signaling phase** over untrusted relay infrastructure.
2. **Transport phase** over WebRTC data channels.

The protocol defines URI bootstrap parameters, signaling wire envelopes, handshake sequence, transport negotiation message carriage, and end-to-end encrypted application payload exchange.

## Motivation
A wallet connectivity protocol should:
- Avoid dependency on a single purpose-built central relay.
- Preserve user privacy when public relay infrastructure is used.
- Allow applications and wallets to communicate over heterogeneous networks.
- Remain adaptable across implementations and programming languages.

This revision emphasizes wire-level interoperability and formal message behavior, independent of any specific SDK.

## Introduction
Open Lavatory connects two peers:
- **Host**: peer that creates and advertises a session URI.
- **Client**: peer that joins using that URI.

Step 0 occurs out-of-band: the session URI is transferred directly between peers (e.g. QR scan, deep link, copy/paste).

The protocol uses signaling only to bootstrap trust and negotiate transport.
After transport is connected, application request/response traffic continues with end-to-end payload encryption.

## Terminology
- **Session URI**: bootstrap URI containing session identifier and handshake parameters.
- **Signaling relay**: untrusted message relay (e.g. MQTT, NTFY, GunDB).
- **Handshake channel**: signaling messages encrypted with the pre-shared handshake key.
- **Encrypted channel**: signaling messages encrypted with peer public-key-derived encryption.
- **Transport**: peer-to-peer WebRTC data channel carrying encrypted application payloads.

## Protocol Overview
### Phase 1: Signaling
- Peers connect to a shared signaling topic/path derived from the session identifier.
- Peers exchange key material and acknowledgements using role-addressed encrypted signaling frames.
- Signaling is encrypted from the first relay message using the pre-shared key `k`; after key exchange it transitions to peer-key encryption mode.

### Phase 2: Transport
- Peers exchange WebRTC offer/answer/candidate payloads through encrypted signaling messages.
- Upon WebRTC channel establishment, encrypted application messages are exchanged directly.

## Session URI Specification
### Format

```text
openlv://<sessionId>@1?h=<hash>&k=<handshakeKey>&p=<protocol>&s=<server>
```

### Fields
- `sessionId`: 16 URL-safe characters from `[A-Za-z0-9_-]`.
- `h`: 16 lowercase hex characters; host key hash hint.
- `k`: 32 lowercase hex characters; pre-shared handshake key material.
- `p`: signaling protocol identifier.
- `s`: signaling server locator.

### Versioning
- URI version host component is currently `1`.

### URI Parameter Requirement
At the protocol level, `p` and `s` are required to ensure deterministic cross-implementation behavior.
Implementations MAY expose local fallback defaults for usability, but such defaults are implementation policy and not normative protocol behavior.

## Signaling Wire Format
All signaling frames are serialized as:

```text
<prefix><recipient><ciphertext>
```

Where:
- `prefix`:
  - `h` = handshake-key encrypted frame.
  - `x` = peer-key encrypted frame.
- `recipient`:
  - `h` = host recipient.
  - `c` = client recipient.
- `ciphertext` = base64 text of encrypted payload bytes.

### Recipient Handling
Receivers MUST ignore frames where `recipient` does not match local role.

## Signaling Message Types
After decryption, signaling payload MUST be valid JSON with one of:

```json
{ "type": "flash", "payload": {}, "timestamp": 0 }
```

```json
{ "type": "pubkey", "payload": { "publicKey": "..." }, "timestamp": 0 }
```

```json
{ "type": "ack", "payload": null, "timestamp": 0 }
```

```json
{ "type": "data", "payload": {}, "timestamp": 0 }
```

Notes:
- `pubkey.payload` MAY include descriptive metadata fields.
- `timestamp` is sender-defined metadata and not a synchronization primitive.

## Signaling Handshake Sequence
Canonical sequence:

1. Client sends `flash` to host using `h` prefix.
2. Host responds with `pubkey` using `h` prefix.
3. Client records host key and sends `pubkey` using `x` prefix.
4. Host records client key and sends `ack` using `x` prefix.
5. Client enters peer-key encryption mode and sends `ack` using `x` prefix.
6. Host enters peer-key encryption mode.

After this sequence, signaling application messages MUST use `type: "data"` over `x` frames (peer-key encryption mode).

## Cryptographic Envelopes
OpenLV uses a two-stage cryptographic progression:
1. **Symmetric stage** for initial signaling confidentiality and integrity.
2. **Asymmetric stage** for peer-to-peer encrypted signaling and transport payload protection.

### Handshake Envelope
Used while only pre-shared key `k` is available.

- Symmetric authenticated encryption.
- Payload bytes are serialized as:

```text
iv || encrypted
```

- Serialized ciphertext is base64 encoded.

### Peer Encryption Envelope
Used after peer key discovery.

- Public-key-based authenticated encryption.
- Payload bytes are serialized as:

```text
ephemeralPublicKey || nonce || ciphertext
```

- Serialized ciphertext is base64 encoded.

This stage is the asymmetric phase of the protocol.

### Algorithm Agility
Current deployments use a specific public-key cryptographic library in practice, but protocol interoperability is defined by envelope semantics and message behavior, not by one library binding.

Future revisions SHOULD define explicit cryptographic suite negotiation/versioning for seamless migration.

## Payload Signatures (Planned Extension)
Signature support is not currently active in the wire protocol.

Planned direction:
- Peers sign payloads (or canonical payload digests) after asymmetric key establishment.
- Receivers verify signatures before accepting payloads as authentic.

Intended security outcome:
- Encryption provides confidentiality.
- Signatures provide explicit message authenticity and stronger tamper evidence.

A future revision SHOULD define:
- Signature algorithm suite and key-binding rules.
- Signed payload canonicalization rules.
- Signature field location in signaling and/or session envelopes.
- Verification failure semantics.

## Transport Negotiation Message Format
During signaling-encrypted phase, transport negotiation payloads are carried as typed objects:

```json
{ "type": "offer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "answer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "candidate", "payload": "<candidate-json-string>" }
```

Implementations MAY emit terminal candidate events without payload as transport-specific control behavior.

## Session Request/Response Envelope
Application-level messages use correlation IDs:

```json
{ "type": "request", "messageId": "<uuid>", "payload": {} }
```

```json
{ "type": "response", "messageId": "<uuid>", "payload": {} }
```

Rules:
- Every `response.messageId` MUST match a prior `request.messageId`.
- Peers SHOULD enforce timeout semantics for unresolved requests.

## Transport Phase Security Property
Once WebRTC transport is established, payload encryption remains end-to-end at the Open Lavatory message layer.

Therefore:
- WebRTC channel security and Open Lavatory payload encryption are layered.
- Relay infrastructure no longer carries transport payloads.

## State Model
### Signaling states
- `standby`
- `connecting`
- `ready`
- `handshake`
- `handshake-partial`
- `encrypted`
- `error`

### Transport states
- `standby`
- `connecting`
- `ready`
- `connected`
- `error`

### Session states
- `created`
- `signaling`
- `ready`
- `linking`
- `connected`
- `disconnected`

## Rationale
- **Two-phase design** keeps relay dependencies minimal while preserving compatibility across constrained networks.
- **Recipient-marked signaling frames** avoid cross-role ambiguity in shared relay channels.
- **Envelope separation (`h` vs `x`)** allows secure bootstrap before full peer encryption is available.
- **Application-level message correlation** supports deterministic request/response semantics independent of transport internals.

## Versioning
This document is a full standalone protocol definition for revision `002`.

Wire compatibility expectations within this revision:
- URI version remains `1`.
- Signaling frame prefixes `h` and `x` are normative.
- Signaling message type names in this document are normative.

Future incompatible wire changes SHOULD introduce explicit version signaling.

## Security Considerations
- Relay operators can observe metadata (topic, timing, server endpoint), but SHOULD NOT access plaintext payloads.
- Implementations MUST use fresh randomness for IV/nonce and ephemeral key material.
- Implementations SHOULD validate decrypted JSON type and schema before acting.
- Replay protection is implementation-defined in current revision and should be strengthened in future revisions.
- Key lifecycle, persistence, and secure deletion are implementation responsibilities.

## Test Vectors and Interop
This revision defines normative wire structures and sequencing. A subsequent revision SHOULD include canonical test vectors for:
- `h` and `x` frame parsing.
- Handshake transcript validation.
- Encrypted envelope decode/encode round-trips.
- Offer/answer/candidate carriage across signaling.

## Copyright
Copyright and related rights waived via CC0.
