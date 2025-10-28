import { encodeConnectionURL } from '@openlv/core';

import { log } from '../utils/log';
import { useEventEmitter } from './useEventEmitter';
import { useProvider } from './useProvider';

export const useSession = () => {
    const provider = useProvider();
    const session = provider.getSession();
    const parameters = session?.getHandshakeParameters();
    const uri = parameters ? encodeConnectionURL(parameters) : undefined;
    const state = session?.getState();

    useEventEmitter(provider.emitter, 'state_change', (state) => {
        log('state change', state);
    });

    return {
        uri,
        state,
    };
};
