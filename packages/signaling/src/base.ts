import type { EncryptionKey, SymmetricKey } from '@openlv/core';
import { EventEmitter } from 'eventemitter3';
import { match } from 'ts-pattern';
import type { MaybePromise } from 'viem';

import type { SignalMessage } from './messages/index.js';

export type SignalBaseProperties = {
    topic: string;
    url: string;
};

export type SignalingBaseLayer = {
    type: string;
    setup: () => MaybePromise<void>;
    teardown: () => MaybePromise<void>;
    publish: (payload: string) => MaybePromise<void>;
    subscribe: (handler: (payload: string) => void) => MaybePromise<void>;
};

export type CreateSignalLayerFn = (
    properties: SignalBaseProperties
) => MaybePromise<SignalingLayer>;

export type SignalingProperties = {
    isHost: boolean;
    h: string;
    k?: SymmetricKey;
    rpDiscovered: (rpKey: string) => MaybePromise<void>;
    // Decrypt using our private key
    decrypt: (message: string) => MaybePromise<string>;
    // Encrypt to relying party
    encrypt: (message: string) => MaybePromise<string>;
    // our public key
    publicKey: EncryptionKey;
    canEncrypt: () => boolean;
};

export type SignalingLayer = (properties: SignalingProperties) => Promise<{
    type: string;
    // waitForConnection: () => Promise<void>;
    // reconnect: () => void;

    // Sending only works once keys are exchanged
    send: (message: object) => MaybePromise<void>;
    subscribe: (handler: (message: object) => void) => MaybePromise<void>;
    setup: () => MaybePromise<void>;
    teardown: () => MaybePromise<void>;

    getState: () => {
        state: SignalingMode;
    };
}>;

export const XR_PREFIX = 'x';
export const XR_H_PREFIX = 'h';

export type SignalingMode =
    // We hold the pubKey that matches the `h`, and are awaiting a relying party
    | 'handshake-open'
    //
    | 'handshaking'
    //
    | 'handshake-closed'
    //
    | 'xr-encrypted'
    // Connecting
    | 'connecting'
    // Disconnected, or not setup yet
    | 'disconnected';

export const createSignalingLayer = (init: SignalingBaseLayer): SignalingLayer => {
    // shared signaling layer logic goes here

    return async ({
        canEncrypt,
        encrypt,
        decrypt,
        rpDiscovered,
        k,
        publicKey,
        isHost,
    }: SignalingProperties) => {
        // shared signaling layer logic goes here
        const handshakeKey = k ? k : undefined;
        let mode: SignalingMode = 'disconnected';
        const subscribeHandler = new EventEmitter<{ message: object }>();

        const send = async (
            method: 'handshake' | 'encrypted',
            recipient: 'h' | 'c',
            payload: SignalMessage
        ) => {
            const prefix = match(method)
                .with('handshake', () => XR_H_PREFIX)
                .with('encrypted', () => XR_PREFIX)
                .exhaustive();

            const message = await match(method)
                .with('handshake', () => {
                    if (!handshakeKey) return;

                    return handshakeKey.encrypt(JSON.stringify(payload));
                })
                .with('encrypted', () => {
                    if (!canEncrypt()) return;

                    return encrypt(JSON.stringify(payload));
                })
                .exhaustive();

            await init.publish(prefix + recipient + message);
        };

        const handleReceive = async (payload: string) => {
            const prefix = payload.slice(0, XR_H_PREFIX.length);
            const recipient = payload.slice(XR_H_PREFIX.length, XR_H_PREFIX.length + 1);
            const body = payload.slice(XR_PREFIX.length + 1);
            const isRecipient = (isHost ? 'h' : 'c') === recipient;

            console.log('isRecipient', isRecipient);

            if (!isRecipient) return;

            await match({ prefix, body })
                .with({ prefix: XR_H_PREFIX }, async () => {
                    if (!handshakeKey) return;

                    const message = await handshakeKey.decrypt(body);
                    const msg = JSON.parse(message) as SignalMessage;

                    await match(msg)
                        .with({ type: 'flash' }, async () => {
                            if (!isHost) return;

                            mode = 'handshaking';
                            await send('handshake', 'c', {
                                type: 'pubkey',
                                payload: {
                                    publicKey: publicKey.toString(),
                                },
                                timestamp: Date.now(),
                            });
                        })
                        .with({ type: 'pubkey' }, async ({ payload }) => {
                            if (isHost) return;

                            await rpDiscovered(payload.publicKey);
                            mode = 'handshake-closed';

                            return await send('encrypted', 'h', {
                                type: 'pubkey',
                                payload: {
                                    publicKey: publicKey.toString(),
                                },
                                timestamp: Date.now(),
                            });
                        })
                        .otherwise(() => {
                            console.log('Received invalid message H', msg);
                        });
                })
                .with({ prefix: XR_PREFIX }, async () => {
                    const message = await decrypt(body);
                    const msg = JSON.parse(message) as SignalMessage;

                    await match(msg)
                        .with({ type: 'pubkey' }, async ({ payload }) => {
                            if (!isHost) return;

                            await rpDiscovered(payload.publicKey);
                            mode = 'xr-encrypted';

                            return await send('encrypted', 'c', {
                                type: 'ack',
                                payload: undefined,
                                timestamp: Date.now(),
                            });
                        })
                        .with({ type: 'ack' }, async () => {
                            if (isHost) return;

                            mode = 'xr-encrypted';
                        })
                        .with({ type: 'data' }, async () =>
                            subscribeHandler.emit('message', msg.payload)
                        )
                        .otherwise(() => {
                            console.log('Received invalid message X', msg);
                        });
                })
                .otherwise(() => {
                    console.log('Received invalid message', payload);
                });
        };

        return {
            type: init.type,
            async setup() {
                mode = 'connecting';
                await init.setup();

                if (!canEncrypt()) {
                    if (!isHost) {
                        mode = 'handshaking';
                        await send('handshake', 'h', {
                            type: 'flash',
                            payload: {},
                            timestamp: Date.now(),
                        });
                    }

                    if (isHost) {
                        mode = 'handshake-open';
                    }
                }

                await init.subscribe(handleReceive);
            },
            async teardown() {
                return await init.teardown();
            },
            send(message) {
                if (!canEncrypt()) {
                    return Promise.reject(
                        new Error('Cannot encrypt message before keys are exchanged')
                    );
                }

                const them = isHost ? 'c' : 'h';

                return send('encrypted', them, {
                    type: 'data',
                    payload: message,
                    timestamp: Date.now(),
                });
            },
            /**
             * Base Signaling Layer Subscriber Handler
             *
             * This handler is responsible for decryption of Handshake & XR Encrypted Messages
             */
            subscribe(handler) {
                subscribeHandler.on('message', handler);
            },
            getState() {
                return { state: mode };
            },
        };
    };
};
