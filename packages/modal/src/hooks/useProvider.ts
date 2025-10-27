import { encodeConnectionURL } from '@openlv/core';
import type { OpenLVProvider } from '@openlv/provider';

export const useProvider = (provider: OpenLVProvider) => {
    const session = provider.getSession();
    const parameters = session?.getHandshakeParameters();
    const uri = parameters ? encodeConnectionURL(parameters) : undefined;

    return { uri };
};
