import { MaybePromise } from 'viem';

import { decryptHandshake, SymmetricKey } from '../encryption/handshake.js';
import { EncryptionKey } from '../encryption/index.js';
import { SignalBaseProperties, SignalingBaseLayer } from './base.js';

export type SignalingProperties = {
    isHost: boolean;
    sessionId: string; // might not even be needed
    h: string;
    k?: SymmetricKey;
    rpDiscovered: (rpKey: string) => void;
    // Decrypt using our private key
    decrypt: (message: string) => string;
    // Encrypt to relying party
    encrypt: (message: string) => string;
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

export type SignalLayerCreator = (properties: SignalBaseProperties) => MaybePromise<SignalingLayer>;

export const XR_PREFIX = 'xr:';
export const XR_H_PREFIX = 'h:';

export type SignalingMode =
    // We hold the pubKey that matches the `h`, and are awaiting a relying party
    'handshake-open' | 'handshake-closed' | 'xr-encrypted';

export const createSignalingLayer = (init: SignalingBaseLayer): SignalingLayer => {
    // shared signaling layer logic goes here

    return async ({
        canEncrypt,
        encrypt,
        decrypt,
        h,
        k,
        publicKey,
        isHost,
    }: SignalingProperties) => {
        // shared signaling layer logic goes here
        const handshakeKey = k ? k : undefined;
        const mode: SignalingMode = canEncrypt() ? 'xr-encrypted' : 'handshake-open';

        const flash = async () => {
            if (!handshakeKey) {
                throw new Error('Handshake key not found');
            }

            const payload = 'flash';
            const message = await handshakeKey.encrypt(payload);

            init.publish(XR_H_PREFIX + message);
        };

        return {
            type: init.type,
            async setup() {
                await init.setup();

                if (!isHost) {
                    console.log('I am not groot, I must flash');
                    await flash();
                }
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
                return init.subscribe(async (payload) => {
                    if (payload.startsWith(XR_H_PREFIX)) {
                        let body = payload.slice(XR_H_PREFIX.length);

                        if (!handshakeKey) {
                            // throw new Error('Handshake key not found');
                            console.error(
                                "Dropping message, couldn't decrypt as there is no handshake key present."
                            );

                            return;
                        }

                        body = await handshakeKey.decrypt(body);
                        console.log('RECEIVED HANDSHAKE MESSAGE', body);

                        return;
                        // handler(body);
                    }

                    if (payload.startsWith(XR_PREFIX)) {
                        let body = payload.slice(XR_PREFIX.length);

                        body = decrypt(body);
                        handler(body);
                    }
                });
            },
            getState() {
                return { state: mode };
            },
        };
    };
};
