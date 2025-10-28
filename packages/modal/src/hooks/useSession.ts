import { encodeConnectionURL } from '@openlv/core';
import type { Session, SessionStateObject } from '@openlv/session';
import { useState } from 'preact/hooks';

import { log } from '../utils/log';
import { useEventEmitter } from './useEventEmitter';
import { useProvider } from './useProvider';

export const useSession = () => {
    const { provider } = useProvider();
    const [session, setSession] = useState<Session | undefined>(provider.getSession());
    const parameters = session?.getHandshakeParameters();
    const uri = parameters ? encodeConnectionURL(parameters) : undefined;
    const [status, setStatus] = useState<SessionStateObject | undefined>(session?.getState());

    useEventEmitter(session?.emitter, 'state_change', (event) => {
        setStatus(event);
    });
    useEventEmitter(provider.emitter, 'session_started', (session) => {
        setSession(session);
        setStatus(session.getState());
    });

    log('session: ', session);

    return {
        uri,
        status,
    };
};

export const useSessionStart = () => {
    const { provider } = useProvider();

    return {
        start: () => {
            provider.createSession();
        },
    };
};
