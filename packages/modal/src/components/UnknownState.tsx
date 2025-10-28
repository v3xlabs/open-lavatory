import type { FC } from 'preact/compat';

import { useProvider } from '../hooks/useProvider';
import { useSession } from '../hooks/useSession';

export const UnknownState: FC<{ state: unknown }> = ({ state }) => {
    const { status: sessionStatus, uri } = useSession();
    const { status: providerStatus } = useProvider();

    console.error('Unknown state: ', { state, sessionStatus, providerStatus });

    return (
        <div className="rounded-md bg-gray-100 p-2 text-gray-500">
            <div>Unknown state: {JSON.stringify(state)}</div>
            <div>URI: {uri}</div>
            <div>Session Status: {JSON.stringify(sessionStatus)}</div>
            <div>Provider Status: {JSON.stringify(providerStatus)}</div>
        </div>
    );
};
