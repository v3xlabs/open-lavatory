import type { OpenLVProvider } from '@openlv/provider';
import { createContext } from 'preact';
import type { FC } from 'preact/compat';
import { useContext } from 'preact/hooks';

import { ModalRoot } from '../components/ModalRoot';

export type ProviderContextO = {
    provider: OpenLVProvider | undefined;
};

export const ProviderContext = createContext<ProviderContextO>({
    provider: undefined,
});

export type ModalProviderProps = {
    provider: OpenLVProvider;
    onClose?: () => void;
};

export const ModalProvider: FC<ModalProviderProps> = ({ provider, onClose }) => {
    return (
        <ProviderContext.Provider value={{ provider }}>
            <ModalRoot onClose={onClose} />
        </ProviderContext.Provider>
    );
};

export const useProvider = () => {
    const context = useContext(ProviderContext);

    if (!context.provider) throw new Error('Provider not found');

    return context.provider;
};

// export const useProvider = (provider: OpenLVProvider) => {
//     const parameters = provider?.getSession()?.getHandshakeParameters();
//     const uri = parameters ? encodeConnectionURL(parameters) : undefined;
//     const [state, setState] = useState<SessionStateObject | undefined>(
//         provider?.getSession()?.getState() ?? undefined
//     );

//     useEffect(() => {
//         const y = (state: SessionStateObject) => {
//             log('provider state changed', state);
//             setState(state);
//         };

//         provider.emitter.on('state_change', y);

//         return () => {
//             provider.emitter.removeListener('state_change', y);
//         };
//     }, [provider, setState]);

//     return { uri, state };
// };
