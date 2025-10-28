import type { Session } from '@openlv/session';

import type { ProviderStatus } from './base';

export type EventMessage = { foo: 'bar' };

export type ProviderEvents = {
    status_change: (status: ProviderStatus) => void;
    session_started: (session: Session) => void;

    message: EventMessage;

    connect: EventMessage;
    disconnect: EventMessage;
    accountsChanged: EventMessage;
    chainChanged: EventMessage;
};
