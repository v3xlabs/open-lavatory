import { EventEmitter } from 'eventemitter3';
import { MaybePromise } from 'viem';

import { SymmetricKey } from '../encryption/handshake.js';
import { EncryptionKey } from '../encryption/index.js';
import { SignalingBaseLayer } from './base.js';
import { SignalMessage, SignalMessageAck, SignalMessageFlash, SignalMessagePubkey } from './messages/index.js';

export type SignalingProperties = {
    isHost: boolean;
    sessionId: string; // might not even be needed
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
    send: (message: string) => MaybePromise<void>;
    subscribe: (handler: (message: string) => void) => MaybePromise<void>;
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
        h,
        k,
        publicKey,
        isHost,
    }: SignalingProperties) => {
        // shared signaling layer logic goes here
        const handshakeKey = k ? k : undefined;
        let mode: SignalingMode = 'disconnected';
        const subscribeHandler = new EventEmitter<{ message: string }>();

        const flash = async () => {
            if (!handshakeKey) {
                throw new Error('Handshake key not found');
            }

            const payload: SignalMessageFlash = {
                type: 'flash',
                payload: {},
                timestamp: Date.now(),
            };
            const message = await handshakeKey.encrypt(JSON.stringify(payload));

            init.publish(XR_H_PREFIX + 'h' + message);
        };

        const flashPub = async () => {
            if (!handshakeKey) {
                throw new Error('Handshake key not found');
            }

            const payload: SignalMessagePubkey = {
                type: 'pubkey',
                payload: {
                    publicKey: publicKey.toString(),
                },
                timestamp: Date.now(),
            };
            const message = await handshakeKey.encrypt(JSON.stringify(payload));

            await init.publish(XR_H_PREFIX + 'c' + message);
        };

        const flashPubEncrypted = async () => {
            if (!canEncrypt()) {
                console.error('Cannot encrypt message before keys are exchanged');

                return;
            }

            const payload: SignalMessagePubkey = {
                type: 'pubkey',
                payload: {
                    publicKey: publicKey.toString(),
                },
                timestamp: Date.now(),
            };

            console.log('final payload', payload);

            const message = await encrypt(JSON.stringify(payload));

            console.log('MESSAGE BEFORE ENCRYPTION', message);

            await init.publish(XR_PREFIX + 'h' + message);
        };

        const flashAckEncrypted = async () => {
            if (!canEncrypt()) return;

            const payload: SignalMessageAck = {
                type: 'ack',
                payload: undefined,
                timestamp: Date.now(),
            };

            const message = await encrypt(JSON.stringify(payload));

            await init.publish(XR_PREFIX + 'c' + message);
        };

        return {
            type: init.type,
            async setup() {
                mode = 'connecting';
                await init.setup();

                if (!canEncrypt()) {
                    if (!isHost) {
                        console.log('I am not groot, I must flash');
                        mode = 'handshaking';
                        await flash();
                    }

                    if (isHost) {
                        mode = 'handshake-open';
                    }
                }

                await init.subscribe(async (payload) => {
                    if (
                        payload.startsWith(XR_H_PREFIX) &&
                        (mode == 'handshake-open' || mode == 'handshaking')
                    ) {
                        const recipient = payload[XR_H_PREFIX.length];
                        const isRecipient = isHost ? 'h' : 'c' === recipient;
                        let body = payload.slice(XR_H_PREFIX.length + 1);

                        if (!handshakeKey) {
                            console.error(
                                "Dropping message, couldn't decrypt as there is no handshake key present."
                            );

                            return;
                        }

                        if (!isRecipient) {
                            return;
                        }

                        body = await handshakeKey.decrypt(body);
                        const msg = JSON.parse(body) as SignalMessage;

                        if (msg.type === 'flash' && isHost) {
                            mode = 'handshaking';

                            await flashPub();

                            return;
                        }

                        if (msg.type === 'pubkey' && !isHost) {
                            await rpDiscovered(msg.payload.publicKey);

                            mode = 'handshake-closed';

                            await flashPubEncrypted();

                            return;
                        }

                        return;
                    }

                    if (payload.startsWith(XR_PREFIX)) {
                        const recipient = payload[XR_PREFIX.length];
                        const isRecipient = isHost ? 'h' : 'c' === recipient;
                        let body = payload.slice(XR_PREFIX.length + 1);

                        if (!isRecipient) {
                            return;
                        }

                        body = await decrypt(body);
                        const msg = JSON.parse(body) as SignalMessage;

                        if (msg.type === 'pubkey' && isHost) {
                            await rpDiscovered(msg.payload.publicKey);
                            mode = 'xr-encrypted';

                            await flashAckEncrypted();

                            return;
                        }

                        if (msg.type === 'ack' && !isHost) {
                            mode = 'xr-encrypted';

                            return;
                        }

                        subscribeHandler.emit('message', body);
                    }
                });
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

                return init.publish(XR_PREFIX + encrypt(message));
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
