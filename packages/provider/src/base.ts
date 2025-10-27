/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSession, type Session } from '@openlv/session';
import { ntfy } from '@openlv/signaling/ntfy';
import { Emitter } from '@wagmi/core/internal';

import type { ProviderEvents } from './events';

export type OpenLVProviderParameters = {
    foo: 'bar';
};

export type OpenLVProvider = {
    emitter: Emitter<ProviderEvents>;
    connect: () => Promise<void>;
    createSession: () => Promise<Session>;
};

let modal: ((provider: OpenLVProvider) => void) | undefined;

export const getModal = async () => {
    if (!modal) {
        modal = await import('@openlv/modal').then((m) => m.triggerOpenModal);
    }

    return modal;
};

export const createProvider = (_parameters: OpenLVProviderParameters): OpenLVProvider => {
    const emitter = new Emitter('x');
    //

    return {
        async connect() {
            const modal = await getModal();

            console.log('loading modal');
            modal?.(this);

            const modalDismissed = new Promise((_resolve) => {
                // modal?.onClose
                // resolve();
            });

            const connectionCompleted = new Promise((_resolve) => {
                // modal?.onStartConnection
                // resolve();
            });

            await Promise.race([modalDismissed, connectionCompleted]);
        },
        createSession: async () => {
            const session = await createSession({ p: 'ntfy', s: 'https://ntfy.sh/' }, ntfy);

            console.log('session created');
            await session.connect();
            console.log('session connected');

            return session;
        },
        emitter,
    };
};
