/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSession, type Session, SessionStateObject } from '@openlv/session';
import { ntfy } from '@openlv/signaling/ntfy';
import EventEmitter from 'eventemitter3';

import type { ProviderEvents } from './events';
import { log } from './utils/log';

export type OpenLVProviderParameters = {
    foo: 'bar';
};

export type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ProviderState = { status: ProviderStatus; session?: SessionStateObject };

export type OpenLVProvider = {
    emitter: EventEmitter<ProviderEvents>;
    createSession: () => Promise<Session>;
    getSession: () => Session | undefined;
    getState: () => ProviderState;
    closeSession: () => Promise<void>;
};

export const createProvider = (_parameters: OpenLVProviderParameters): OpenLVProvider => {
    const emitter = new EventEmitter<ProviderEvents>();
    let session: Session | undefined;
    let status: ProviderStatus = 'disconnected';

    const updateStatus = (newStatus: ProviderStatus) => {
        status = newStatus;
        emitter.emit('status_change', newStatus);
    };

    return {
        createSession: async () => {
            updateStatus('connecting');
            session = await createSession({ p: 'ntfy', s: 'https://ntfy.sh/' }, ntfy);

            log('session created');
            await session.connect();
            log('session connected');
            // updateStatus('connected');
            emitter.emit('session_started', session);

            return session;
        },
        getSession: () => session,
        closeSession: async () => {
            await session?.close();
            session = undefined;
            updateStatus('disconnected');
        },
        getState: () => ({ status }),
        emitter,
    };
};
