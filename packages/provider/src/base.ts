/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSession, type Session } from '@openlv/session';
import { ntfy } from '@openlv/signaling/ntfy';
import EventEmitter from 'eventemitter3';

import type { ProviderEvents } from './events';

export type OpenLVProviderParameters = {
    foo: 'bar';
};

export type OpenLVProvider = {
    emitter: EventEmitter<ProviderEvents>;
    createSession: () => Promise<Session>;
    getSession: () => Session | undefined;
    closeSession: () => Promise<void>;
};

export const createProvider = (_parameters: OpenLVProviderParameters): OpenLVProvider => {
    const emitter = new EventEmitter<ProviderEvents>();
    let session: Session | undefined;

    return {
        createSession: async () => {
            emitter.emit('session_started');
            session = await createSession({ p: 'ntfy', s: 'https://ntfy.sh/' }, ntfy);

            emitter.emit('state_change', session.getState());
            console.log('session created');
            await session.connect();
            console.log('session connected');
            emitter.emit('state_change', session.getState());

            return session;
        },
        getSession: () => session,
        closeSession: async () => {
            await session?.close();
            session = undefined;
            emitter.emit('state_change', undefined);
            emitter.emit('disconnect');
        },
        emitter,
    };
};
