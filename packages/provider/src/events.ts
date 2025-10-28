import type { SessionStateObject } from '@openlv/session';

export type EventMessage = { foo: 'bar' };

export type ProviderEvents = {
    state_change: (state?: SessionStateObject) => void;
    session_started: () => void;

    message: EventMessage;

    connect: EventMessage;
    disconnect: EventMessage;
    accountsChanged: EventMessage;
    chainChanged: EventMessage;
};
