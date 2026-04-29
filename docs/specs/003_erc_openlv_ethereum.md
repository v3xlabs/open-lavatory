# ERC: open-lavatory Wallet-Dapp Session Transport

## Preamble

```yaml
erc: TBD
title: open-lavatory Wallet-Dapp Session Transport
description: A wire protocol for establishing wallet-dapp sessions and transporting EIP-1193 messages over user-chosen relay and peer-to-peer infrastructure.
author: TBD
discussions-to: TBD
status: Draft
type: Standards Track
category: ERC
created: 2026-04-29
requires: 1193
```

## Abstract

This specification defines `open-lavatory`, hereafter `openlv`, an
Ethereum wallet-dapp connection protocol for establishing a session and
transporting [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)
request and response messages.

`openlv` standardizes:

- A session bootstrap URI.
- A signaling wire format for key exchange and transport negotiation.
- A direct transport message envelope for correlated request/response
  exchange.
- A session resumption model suitable for wallets and dapps.

`openlv` does not replace EIP-1193. Instead, it provides a portable,
user-controlled session establishment and message transport layer for
EIP-1193 communication between Ethereum wallets and dapps.

## Motivation

Ethereum wallet connectivity should remain interoperable without making
wallets or dapps depend on a single hosted service, proprietary control
plane, account portal, API key, or billing relationship.

In practice, commonly deployed wallet connection stacks often couple
session establishment to centralized infrastructure and service
enrollment. This reduces portability across implementations and can work
against user autonomy.

`openlv` defines a minimal wire protocol that preserves the familiar
wallet-pairing flow while allowing implementations to:

- use user-chosen or application-chosen relay infrastructure,
- minimize trust in relays,
- transport standard EIP-1193 messages unchanged,
- support desktop and mobile pairing flows, and
- resume prior sessions using locally stored session state.

## Specification Scope

This specification covers:

- bootstrap URI syntax and semantics,
- peer roles,
- signaling framing,
- handshake sequencing,
- transport negotiation carriage,
- EIP-1193 request/response carriage, and
- session resumption guidance.

This specification does not define:

- wallet user interface requirements,
- QR encoding format beyond carrying the session URI,
- a mandatory relay protocol or relay provider,
- a general-purpose non-Ethereum RPC schema, or
- future cryptographic suite negotiation beyond the current version.

## Terminology

- **Host**: The peer that creates a session and produces the session
  URI. In common deployments this is the dapp side.
- **Client**: The peer that joins using the session URI. In common
  deployments this is the wallet side.
- **Session URI**: The `openlv://` URI transferred out-of-band to begin
  a session.
- **Signaling relay**: Untrusted infrastructure used only to exchange
  encrypted signaling messages and transport negotiation payloads.
- **Handshake channel**: Signaling frames encrypted with the bootstrap
  handshake key.
- **Peer-encrypted channel**: Signaling frames encrypted to the
  recipient peer public key.
- **Transport**: The direct peer-to-peer channel used after signaling,
  currently WebRTC data channels in version 1.
- **Session state**: Locally stored material sufficient to re-invoke a
  prior session.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

## Roles And Bootstrap Transfer

Session establishment begins with out-of-band transfer of a session URI
from host to client.

Desktop implementations MUST support session bootstrap by copy-paste of
the `openlv://` URI string.

Mobile implementations SHOULD support one or both of the following:

- QR code scanning of the `openlv://` URI.
- Deep-link handling of the `openlv://` URI.

Implementations MAY support additional transfer mechanisms so long as
the exact URI contents are preserved.

## Session URI

### Format

The version 1 session URI format is:

```text
openlv://<sessionId>@1?h=<h>&k=<k>&p=<p>&s=<s>
```

### Required Fields

All fields shown above are REQUIRED for deterministic interoperability.

- `sessionId`: a 16-character URL-safe identifier.
- `h`: a 16-character lowercase hexadecimal host key hash hint.
- `k`: a 32-character lowercase hexadecimal handshake key.
- `p`: the signaling protocol identifier.
- `s`: the signaling server locator.

At the protocol level, `p` and `s` are REQUIRED. Implementations MAY
expose local defaults as a usability convenience, but such defaults are
not normative protocol behavior and MUST NOT be assumed by interoperable
peers.

### Field Constraints

For version 1:

- `sessionId` MUST match the regular expression
  `^[A-Za-z0-9_-]{16}$`.
- `h` MUST match the regular expression `^[0-9a-f]{16}$`.
- `k` MUST match the regular expression `^[0-9a-f]{32}$`.
- `p` MUST be a non-empty signaling protocol identifier.
- `s` MUST be a non-empty signaling server locator string.

### Session Identifier

`sessionId` identifies the shared signaling topic, path, or equivalent
relay namespace used for the session.

Version 1 uses 16 characters from the URL-safe alphabet
`[A-Za-z0-9_-]`.

### Host Key Hash Hint

`h` is a host key hash hint included in the session URI.

In version 1, `h` is derived by:

1. serializing the host encryption public key as a string,
2. hashing the resulting bytes with SHA-256,
3. hex-encoding the digest as lowercase hexadecimal, and
4. truncating to the first 16 hexadecimal characters.

### Handshake Key

`k` provides symmetric key material for the initial signaling phase.

In version 1, `k` is a 32-character lowercase hexadecimal string. The
literal UTF-8 bytes of this string are imported directly as the
symmetric encryption key material for the handshake channel.

### Example

```text
openlv://k7n8m9x2w5q1p3r6@1?h=a1b2c3d4e5f60708&k=0123456789abcdef0123456789abcdef&p=mqtt&s=wss%3A%2F%2Ftest.mosquitto.org%3A8081%2Fmqtt
```

## Signaling Relay Model

Peers MUST connect to a shared relay namespace derived from
`sessionId`.

This specification does not mandate a single relay protocol. A relay is
conforming if it can carry ordered byte-equivalent text payloads between
peers within a shared namespace.

Relay infrastructure is considered untrusted. Relays MAY observe
metadata such as:

- namespace or topic,
- timing,
- message size,
- server endpoint, and
- connection origin metadata available at the transport layer.

Relays MUST NOT be required to decrypt signaling payloads.

`mqtt` and `ntfy` are non-normative example relay mechanisms used by
current implementations.

## Signaling Wire Format

Each signaling frame is serialized as:

```text
<prefix><recipient><ciphertext>
```

Where:

- `prefix` is one ASCII character identifying the encryption mode.
- `recipient` is one ASCII character identifying the intended role.
- `ciphertext` is base64 text carrying the encrypted JSON payload.

### Prefix Values

- `h`: handshake-key encrypted frame.
- `x`: peer-key encrypted frame.

### Recipient Values

- `h`: host recipient.
- `c`: client recipient.

Receivers MUST ignore frames where `recipient` does not match the local
role.

## Signaling Message Types

After decryption, the signaling payload MUST be valid JSON and MUST
contain:

- `type`: signaling message type string.
- `payload`: type-dependent payload.
- `timestamp`: sender-defined numeric timestamp.

Version 1 defines the following signaling message types.

### `flash`

```json
{
  "type": "flash",
  "payload": {},
  "timestamp": 1714392000000
}
```

Sent by the client to initiate the handshake.

### `pubkey`

```json
{
  "type": "pubkey",
  "payload": {
    "publicKey": "..."
  },
  "timestamp": 1714392000000
}
```

`payload.publicKey` MUST contain the sender public key serialization
used by the active peer-encryption scheme.

`payload` MAY include descriptive metadata such as wallet or dapp
information.

### `ack`

```json
{
  "type": "ack",
  "payload": null,
  "timestamp": 1714392000000
}
```

Sent to confirm transition into peer-encrypted signaling.

### `data`

```json
{
  "type": "data",
  "payload": {},
  "timestamp": 1714392000000
}
```

Carries transport negotiation payloads or other signaling-stage data
after peer key discovery.

## Handshake Sequence

The version 1 handshake sequence is:

1. The client sends a `flash` message to the host using an `h` frame.
2. The host replies with a `pubkey` message to the client using an `h`
   frame.
3. The client records the host public key and replies with a `pubkey`
   message to the host using an `x` frame.
4. The host records the client public key and replies with an `ack`
   message to the client using an `x` frame.
5. The client enters peer-encrypted signaling mode and sends an `ack`
   message to the host using an `x` frame.
6. The host enters peer-encrypted signaling mode.

After this sequence completes, signaling application payloads MUST be
carried using `data` messages inside `x` frames.

## Cryptographic Behavior

Version 1 defines current cryptographic behavior for interoperability,
while leaving future revisions room to introduce explicit suite
negotiation.

### Handshake Encryption

Handshake frames use symmetric authenticated encryption.

Version 1 uses:

- AES-GCM,
- a fresh 12-byte random IV per message, and
- the UTF-8 bytes of the 32-character `k` string as imported key
  material.

The serialized encrypted payload is:

```text
base64(iv || ciphertext)
```

### Peer Encryption

Peer-encrypted frames use public-key authenticated encryption.

Version 1 uses NaCl box-compatible behavior as implemented by the
reference implementation, with an ephemeral sender key per message.

The serialized encrypted payload is:

```text
base64(ephemeralPublicKey || nonce || ciphertext)
```

Where:

- `ephemeralPublicKey` is the sender ephemeral public key,
- `nonce` is the scheme nonce, and
- `ciphertext` is the encrypted message bytes.

### Crypto Agility

Future revisions SHOULD define explicit cryptographic suite identifiers
and negotiation rules.

Implementations MUST treat version 1 cryptographic behavior as normative
for version 1 interoperability.

Implementations SHOULD avoid hard-coding assumptions that prevent later
migration to a negotiated suite model.

## Transport Negotiation

After peer key exchange, peers negotiate a direct transport through the
peer-encrypted signaling channel.

Version 1 standardizes carriage of WebRTC negotiation payloads.

Transport negotiation payloads MUST be wrapped as signaling `data`
messages whose `payload` is one of the following objects:

```json
{ "type": "offer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "answer", "payload": "<sdp-json-string>" }
```

```json
{ "type": "candidate", "payload": "<candidate-json-string>" }
```

The contents of the `payload` string are transport-specific serialized
objects.

Version 1 uses WebRTC offer, answer, and ICE candidate objects encoded
as JSON strings.

## Session Envelope

Application messages exchanged between peers use a correlated session
envelope:

```json
{
  "type": "request",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {}
}
```

```json
{
  "type": "response",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": {}
}
```

Rules:

- `messageId` MUST uniquely identify the request within the active
  session.
- A `response.messageId` MUST match a previously sent `request`.
- Peers SHOULD enforce timeout semantics for unresolved requests.

## EIP-1193 Message Transport

`openlv` transports EIP-1193 messages as the `payload` field of the
session envelope.

An EIP-1193 request example:

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

An EIP-1193 response example:

```json
{
  "type": "response",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "payload": [
    "0x1234567890abcdef1234567890abcdef12345678"
  ]
}
```

This specification does not redefine EIP-1193 semantics. Wallets and
dapps remain responsible for request handling, authorization, error
mapping, event behavior, and chain-specific method support as defined by
EIP-1193 and related Ethereum standards.

## Session Resumption

Wallets and dapps MAY persist session state locally to support later
resumption.

Persisted session state MAY include:

- `sessionId`,
- signaling protocol `p`,
- signaling server locator `s`,
- handshake key `k`,
- local encryption public key,
- local decryption key,
- peer public key if known, and
- any transport-specific configuration needed to re-invoke the session.

Resumption in version 1 is defined as re-invoking communication using
previously stored local session material.

Resumption does not guarantee transport continuity. An implementation
MAY need to:

- reconnect to the signaling relay,
- re-establish peer-encrypted signaling state,
- renegotiate the transport, and
- resume EIP-1193 request flow once connectivity is restored.

Implementations SHOULD treat locally persisted session state as
sensitive material.

## Relay And Transport Independence

This specification separates:

- bootstrap and key exchange,
- relay-specific delivery mechanics,
- transport negotiation, and
- application-layer EIP-1193 message carriage.

This allows multiple relay backends and future transports to remain
compatible with the same session model and envelope semantics.

## Security Considerations

- Session URIs contain sensitive bootstrap material and MUST be handled
  as secrets until the handshake completes.
- Implementations MUST use fresh randomness for IVs, nonces, ephemeral
  keys, and generated session identifiers.
- Relays are untrusted and can observe metadata even when payloads are
  encrypted.
- Implementations SHOULD validate decrypted JSON structure and expected
  message types before acting on payloads.
- Implementations SHOULD apply request timeouts and resource limits to
  reduce hanging or abusive sessions.
- Replay protection is not fully standardized in version 1 and SHOULD be
  improved in future revisions.
- Locally persisted session state SHOULD be stored with the strongest
  platform protections available.
- Implementations SHOULD allow users to explicitly disconnect and delete
  saved session state.

## Rationale

The protocol uses an out-of-band URI because it gives users and
implementations a simple, inspectable bootstrap artifact that can be
transferred through QR codes, deep links, or copy-paste.

The protocol uses signaling only as a bootstrap and negotiation layer so
that relay infrastructure does not remain in the path for ordinary
wallet-dapp traffic.

The protocol uses a correlated request/response envelope so that EIP-1193
messages can be transported without modifying their application-layer
meaning.

The protocol requires explicit `p` and `s` fields to preserve
deterministic interoperability and to avoid hidden assumptions about a
single default relay provider.

## Backwards And Forwards Compatibility

Version 1 compatibility is determined by:

- the `openlv://` URI format,
- URI version host component `@1`,
- the field constraints for `sessionId`, `h`, and `k`,
- signaling prefixes `h` and `x`,
- signaling recipient markers `h` and `c`,
- signaling message types `flash`, `pubkey`, `ack`, and `data`, and
- the session envelope using `request`, `response`, and `messageId`.

Future incompatible changes SHOULD use an explicit new protocol version.

Future revisions SHOULD define a formal extension point for
cryptographic suite negotiation and additional transports.

## Reference Implementation Notes

The current reference implementation is the `open-lavatory` codebase.
For version 1 behavior, the implementation in `packages/*/src`
constitutes the primary source of implementation guidance.

In particular:

- URI behavior is implemented in `packages/core/src/url/index.ts`.
- Session parameter shapes are implemented in
  `packages/core/src/session.ts`.
- Signaling wire behavior is implemented in
  `packages/signaling/src/base.ts`.
- Session orchestration is implemented in
  `packages/session/src/base.ts`.
- Current transport negotiation carriage is implemented in
  `packages/transport/src/webrtc/index.ts`.

Historical documentation may describe broader or earlier design goals.
Where such documents differ from current implementation, version 1 wire
behavior should follow the implementation.

## Copyright

Copyright and related rights waived via CC0.
