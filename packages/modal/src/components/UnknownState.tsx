import type { FC } from 'preact/compat';

import { useProvider } from '../hooks/useProvider';
import { useSession } from '../hooks/useSession';

export const UnknownState: FC<{ state: string }> = ({ state }) => {
    const { status: sessionStatus, uri } = useSession();
    const { status: providerStatus } = useProvider();

    return (
        <div className="rounded-md bg-gray-100 p-2 text-gray-500">
            <div>Unknown state: {state}</div>
            <div>URI: {uri}</div>
            <div>Session Status: {JSON.stringify(sessionStatus)}</div>
            <div>Provider Status: {JSON.stringify(providerStatus)}</div>
        </div>
    );
};
