# open-lavatory

Specification to connect Peer A (a browser-based dApp) with Peer B (a browser-based (mobile) wallet).
Establishes initial connection via a public MQTT server.
Then connects via webrtc peer-to-peer to relay further traffic.

## Peer A
 - init openlvconnection
 - Initialize Session (initSession)
   - gen random sessionId & sharedKey
   - encode sessionId & sharedKey to openLVUrl
   - share openLVUrl via QR or copy-paste to Peer B

## Peer B
 - Scan openLVUrl or paste it in from Peer A
 - decode openLVUrl to sessionId & sharedKey
 - init openlvconnection
 - connectToSession
 - peer B notifies peer A sends a "hello" style message to peer A

## remainder

- peer A receives msg, starts webrtc connection, shares its webrtc pairing data with peer B via mqtt topic
- peer B receives msg, starts webrtc connection, shares its webrtc pairing data with peer A via mqtt topic, and setRemoteDesciption of peerA
- peer A and B establish a webrtc connection
- from now on we can relay messages over this connection
