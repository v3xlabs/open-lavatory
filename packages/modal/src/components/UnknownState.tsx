import type { FC } from 'preact/compat';

import { useSession } from '../hooks/useSession';

export const UnknownState: FC<{ state: string }> = ({ state }) => {
    const { state: sessionState, uri } = useSession();

    return (
        <div className="p-2 rounded-md bg-gray-100 text-gray-500">
            <div>Unknown state: {state}</div>
            <div>URI: {uri}</div>
            <div>State: {JSON.stringify(sessionState)}</div>
        </div>
    );
};
