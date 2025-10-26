export type EventMessage = { foo: 'bar' };

export type ProviderEvents = {
    display_uri: EventMessage;
    message: EventMessage;
    connect: EventMessage;
    disconnect: EventMessage;
    accountsChanged: EventMessage;
    chainChanged: EventMessage;
};
