import { deriveSymmetricKey, generateHandshakeKey } from '../encryption/handshake.js';
import { initHash } from '../encryption/hash.js';
import {
    DecryptionKey,
    decryptMessage,
    EncryptionKey,
    encryptMessage,
    initEncryptionKeys,
} from '../encryption/index.js';
import { generateSessionId } from '../encryption/session.js';
import { SignalingLayer, SignalingMode, SignalLayerCreator } from '../signaling/index.js';
import { mqtt } from '../signaling/mqtt/index.js';
import { ntfy } from '../signaling/ntfy/index.js';
import { decodeConnectionURL } from '../utils/url.js';

// typescript type for 32 character hex string
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
type Hex<L> = string;

/**
 * The parameters from the connection url
 */
export type SessionHandshakeParameters = {
    // Unique session identifier
    sessionId: Hex<16>;
    // Hash of peerA's public key
    h: Hex<16>;
    // Shared key for symmetric encryption during handshake
    k: Hex<16>;
    // Protocol for signaling
    p: string;
    // Signaling server URL
    s: string;
};

/**
 * The parameters that describe a session
 * these can be used to restart a session
 */
export type SessionConnectionParameters = SessionHandshakeParameters & {
    relyingPublicKey: EncryptionKey;
    // Our public key for the relying party to encrypt messages to us
    encryptionKey: EncryptionKey;
    // Our private key for decrypting messages from the relying party
    decryptionKey: DecryptionKey;
};

export type SessionState = 'create' | 'handshake' | 'connected';

export type Session = {
    getState(): { state: SessionState; signaling?: { state: SignalingMode } };
    getHandshakeParameters(): SessionHandshakeParameters;
    connect(): Promise<void>;
};

export type SessionCreationParameters = Pick<SessionHandshakeParameters, 'p' | 's'>;

export type SessionParameters =
    | SessionConnectionParameters
    | SessionHandshakeParameters
    | SessionCreationParameters;

export const createSession = async (
    initParameters: SessionParameters,
    signalLayer: SignalLayerCreator
): Promise<Session> => {
    const sessionId =
        'sessionId' in initParameters ? initParameters.sessionId : generateSessionId();
    const { encryptionKey, decryptionKey } = await initEncryptionKeys(initParameters);
    let relyingPublicKey: EncryptionKey | undefined;
    const handshakeKey =
        'k' in initParameters
            ? await deriveSymmetricKey(initParameters.k)
            : await generateHandshakeKey();
    const { hash, isHost } = await initHash(
        'h' in initParameters ? initParameters.h : undefined,
        encryptionKey
    );
    const state: SessionState = 'handshake';
    const protocol = initParameters.p;
    const server = initParameters.s;

    const signaling: SignalingLayer = await signalLayer({ topic: sessionId, url: server });
    const signal = await signaling({
        h: hash,
        canEncrypt() {
            return relyingPublicKey !== undefined;
        },
        encrypt(message) {
            if (!relyingPublicKey) {
                throw new Error('Relying party public key not found');
            }

            return encryptMessage(message, relyingPublicKey);
        },
        decrypt(message) {
            if (!decryptionKey) {
                throw new Error('Decryption key not found');
            }

            return decryptMessage(message, decryptionKey);
        },
        publicKey: encryptionKey,
        sessionId,
        k: handshakeKey,
        rpDiscovered(rpKey) {
            console.log('rpKey', rpKey);
            relyingPublicKey = rpKey;
        },
        isHost,
    });

    // let transport: TransportLayer | undefined;

    return {
        connect: async () => {
            // TODO: implement
            console.log('connecting to session');
            await signal.setup();

            signal.subscribe((message) => {
                console.log('Session: received message from signaling', message);
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
export const connectSession = async (connectionUrl: string): Promise<Session> => {
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
