import {
    decodeConnectionURL,
    type SessionHandshakeParameters,
    type SessionParameters,
} from '@openlv/core';
import {
    deriveSymmetricKey,
    type EncryptionKey,
    generateHandshakeKey,
    generateSessionId,
    initEncryptionKeys,
    initHash,
    parseEncryptionKey,
} from '@openlv/core/encryption';
import type { CreateSignalLayerFn, SignalingLayer, SignalingMode } from '@openlv/signaling';
import { mqtt } from '@openlv/signaling/mqtt';
import { ntfy } from '@openlv/signaling/ntfy';
import { EventEmitter } from 'eventemitter3';

import type { SessionEvents } from './events.js';
import type { SessionMessage } from './messages/index.js';

export type SessionState = 'create' | 'handshake' | 'signaling' | 'encrypted' | 'connected';
export type SessionStateObject = {
    state: SessionState;
    signaling?: {
        state: SignalingMode;
    };
};

export type Session = {
    getState(): SessionStateObject;
    getHandshakeParameters(): SessionHandshakeParameters;
    connect(): Promise<void>;
    close(): Promise<void>;
    // Send with response
    send(message: object, timeout?: number): Promise<unknown>;
    emitter: EventEmitter<SessionEvents>;
};

export const createSession = async (
    initParameters: SessionParameters,
    signalLayer: CreateSignalLayerFn
): Promise<Session> => {
    const emitter = new EventEmitter<SessionEvents>();
    const messages = new EventEmitter<{ message: SessionMessage }>();
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

    signal.emitter.on('state_change', (mode) => {
        // todo: fix later
        emitter.emit('state_change', { state, signaling: { state: mode } });
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

                const sessionMsg = message as SessionMessage;

                if (sessionMsg.type === 'data') {
                    console.log('Session: received data message', sessionMsg.payload);
                    messages.emit('message', sessionMsg);
                }
            });
        },
        async close() {
            await signal?.teardown();
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
        async send(message: object, timeout: number = 1000) {
            const ready = signal.getState().state === 'xr-encrypted';

            if (!ready) {
                throw new Error('Session not ready');
            }

            const randomID = crypto.randomUUID();
            const sessionMessage: SessionMessage = {
                type: 'data',
                messageId: randomID,
                payload: message,
            };

            // for now use signaling
            await signal.send(sessionMessage);

            return Promise.race([
                new Promise((resolve) => {
                    messages.on('message', (message) => {
                        if (message.messageId === randomID && message.type === 'data') {
                            resolve(message.payload);
                        }
                    });
                }),
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(new Error('Timeout'));
                    }, timeout);
                }),
            ]);
        },
        emitter,
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
