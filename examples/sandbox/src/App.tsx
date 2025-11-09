import { decodeConnectionURL, encodeConnectionURL } from '@openlv/core';
import { createProvider, type ProviderStatus } from '@openlv/provider';
import type { SessionStateObject } from '@openlv/session';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useEventEmitter } from './effect';

const provider = createProvider({});

const SessionConnect = () => {
    const [url, setUrl] = useState<string | undefined>(undefined);

    return (
        <div className="flex gap-2">
            <input
                type="text"
                placeholder="URL"
                className="rounded-md border px-4 py-2"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
            <button
                onClick={async () => {
                    if (!url) return;

                    const parameters = decodeConnectionURL(url);

                    if (!parameters) return;

                    await provider.createSession(parameters);
                }}
                className="btn"
            >
                Connect
            </button>
        </div>
    );
};

const App = () => {
    const [status, setStatus] = useState<ProviderStatus | undefined>(provider.getState().status);
    const [sessionStatus, setSessionStatus] = useState<SessionStateObject | undefined>(
        provider.getState().session
    );

    useEventEmitter(provider, 'status_change', (state: ProviderStatus) => {
        console.log('status_change', state, provider.getState());
        setStatus(state);
        setSessionStatus(provider.getState().session);
    });
    useEventEmitter(
        provider,
        'session_started',
        (session: { getState: () => SessionStateObject }) => {
            console.log('sandbox: session_started', session.getState());
            setSessionStatus(session.getState());
        }
    );

    const canStartSession = status === 'disconnected';
    const connectionParameters = provider.getSession()?.getHandshakeParameters();
    const connectionUrl = connectionParameters
        ? encodeConnectionURL(connectionParameters)
        : undefined;

    return (
        <div className="min-h-screen w-full space-y-4 bg-gray-100 p-4">
            <div className="flex w-full gap-4">
                <div className="w-full space-y-4">
                    <div className="space-y-4 border p-4">
                        <div className="w-fit">Status: {status}</div>
                        <div className="w-fit">Session Status: {JSON.stringify(sessionStatus)}</div>
                    </div>
                    <div className="space-y-4 border p-4">
                        <div>{connectionUrl && <QRCodeSVG value={connectionUrl} />} </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => provider.createSession()}
                                className="btn"
                                disabled={!canStartSession}
                            >
                                Create Session
                            </button>
                            {provider.getSession() && (
                                <button onClick={() => provider.closeSession()} className="btn">
                                    Close Session
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full space-y-4 border p-4">
                    <div>
                        <SessionConnect />
                    </div>
                </div>
            </div>
        </div>
    );
};

export { App };
