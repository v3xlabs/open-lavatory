# OpenLV Transport

user clicks openlv in dApp
openlv modal opens up
user configures desired signaling method (server info)
user clicks "start connection"

transport layer is created
- signaling layer is created
- signaling layer connects to configured signaling method
- signaling layer subscribes to sessionId topic
- signaling generates a keypair for encryption decryption, call it privKeyA and pubKeyA
- connection url is created which includes sessionId, pubKeyA, and signaling method connection info

- user scans connection url with wallet, or copies and pastes connection url into wallet
- wallet passes url
- wallet creates transport layer and signaling layer to connect to signaling method
- wallet connects to signaling method, and says hello on topic sessionId, encrypted with pubKeyA
hello message contains wallet pubKeyB

- dApp's transport layer receives the hello message, decrypt it with privKeyA
