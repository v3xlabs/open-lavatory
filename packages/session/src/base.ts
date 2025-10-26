import {
  decodeConnectionURL,
  deriveSymmetricKey,
  EncryptionKey,
  generateHandshakeKey,
  generateSessionId,
  initEncryptionKeys,
  initHash,
  parseEncryptionKey,
  SessionHandshakeParameters,
  SessionParameters,
} from "@openlv/core";
import {
  SignalingLayer,
  SignalingMode,
  SignalLayerCreator,
} from "@openlv/signaling";
import { mqtt } from "@openlv/signaling/mqtt";
import { ntfy } from "@openlv/signaling/ntfy";

export type SessionState =
  | "create"
  | "handshake"
  | "signaling"
  | "encrypted"
  | "connected";

export type Session = {
  getState(): { state: SessionState; signaling?: { state: SignalingMode } };
  getHandshakeParameters(): SessionHandshakeParameters;
  connect(): Promise<void>;
};

export const createSession = async (
  initParameters: SessionParameters,
  signalLayer: SignalLayerCreator,
): Promise<Session> => {
  const sessionId =
    "sessionId" in initParameters
      ? initParameters.sessionId
      : generateSessionId();
  const { encryptionKey, decryptionKey } =
    await initEncryptionKeys(initParameters);
  let relyingPublicKey: EncryptionKey | undefined;
  const handshakeKey =
    "k" in initParameters
      ? await deriveSymmetricKey(initParameters.k)
      : await generateHandshakeKey();
  const { hash, isHost } = await initHash(
    "h" in initParameters ? initParameters.h : undefined,
    encryptionKey,
  );
  const state: SessionState = "handshake";
  const protocol = initParameters.p;
  const server = initParameters.s;

  const signaling: SignalingLayer = await signalLayer({
    topic: sessionId,
    url: server,
  });
  const signal = await signaling({
    h: hash,
    canEncrypt() {
      return relyingPublicKey !== undefined;
    },
    async encrypt(message) {
      if (!relyingPublicKey) {
        throw new Error("Relying party public key not found");
      }

      console.log("encrypting to " + relyingPublicKey.toString());

      return await relyingPublicKey.encrypt(message);
    },
    async decrypt(message) {
      if (!decryptionKey) {
        throw new Error("Decryption key not found");
      }

      return await decryptionKey.decrypt(message);
    },
    publicKey: encryptionKey,
    k: handshakeKey,
    async rpDiscovered(rpKey) {
      const role = isHost ? "host" : "client";

      console.log("rpKey discovered by " + role, rpKey);

      relyingPublicKey = await parseEncryptionKey(rpKey);
    },
    isHost,
  });

  // let transport: TransportLayer | undefined;

  return {
    connect: async () => {
      console.log("connecting to session, isHost:", isHost);
      // TODO: implement
      console.log("connecting to session");
      await signal.setup();

      signal.subscribe((message) => {
        console.log("Session: received message from signaling", message);
      });
    },
    getState() {
      return { state, signaling: signal.getState() };
    },
    getHandshakeParameters() {
      return {
        sessionId,
        h: hash,
        k: handshakeKey.toString(),
        p: protocol,
        s: server,
      };
    },
    // getAsParameters() {
    //     return {
    //         ...initParameters,
    //         relyingPublicKey,
    //         encryptionKey,
    //         decryptionKey,
    //     };
    // },
  };
};

/**
 * Connect to a session from its openlv:// URL
 */
export const connectSession = async (
  connectionUrl: string,
): Promise<Session> => {
  const initParameters = decodeConnectionURL(connectionUrl);

  const signaling = {
    mqtt: mqtt,
    ntfy: ntfy,
  }[initParameters.p];

  if (!signaling) {
    throw new Error(`Invalid signaling protocol: ${initParameters.p}`);
  }

  return createSession(initParameters, signaling);
};
