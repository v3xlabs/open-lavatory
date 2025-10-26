import { deriveSymmetricKey, generateHandshakeKey } from '../encryption/handshake.js';
import { initHash } from '../encryption/hash.js';
import {
    DecryptionKey,
    EncryptionKey,
    initEncryptionKeys,
    parseEncryptionKey,
} from '../encryption/index.js';
import { generateSessionId } from '../encryption/random.js';
import { SignalLayerCreator } from '../signaling/base.js';
import { SignalingLayer, SignalingMode } from '../signaling/index.js';
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

export type SessionState = 'create' | 'handshake' | 'signaling' | 'encrypted' | 'connected';

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
        async encrypt(message) {
            if (!relyingPublicKey) {
                throw new Error('Relying party public key not found');
            }

            console.log('encrypting to ' + relyingPublicKey.toString());

            return await relyingPublicKey.encrypt(message);
        },
        async decrypt(message) {
            if (!decryptionKey) {
                throw new Error('Decryption key not found');
            }

            return await decryptionKey.decrypt(message);
        },
        publicKey: encryptionKey,
        k: handshakeKey,
        async rpDiscovered(rpKey) {
            const role = isHost ? 'host' : 'client';

            console.log('rpKey discovered by ' + role, rpKey);

            relyingPublicKey = await parseEncryptionKey(rpKey);
        },
        isHost,
    });

    // let transport: TransportLayer | undefined;

    return {
        connect: async () => {
            console.log('connecting to session, isHost:', isHost);
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
