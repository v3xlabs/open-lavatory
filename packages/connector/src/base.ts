/* eslint-disable @typescript-eslint/no-unused-vars */
import { createProvider, type OpenLVProvider } from '@openlv/provider';
import { createConnector } from '@wagmi/core';

import { openlvDetails } from './config';
import { log } from './log';
import { getTriggerModal } from './modal';

export type OpenLVConnectorParameters = unknown;
// type ConnectorProperties = { foo: string };

export const openlv = (_parameters?: OpenLVConnectorParameters) => {
    const provider = createProvider({ foo: 'bar' });

    return createConnector<OpenLVProvider>((wagmiConfig) => {
        const { chains } = wagmiConfig;
        // const transports = wagmiConfig.transports;

        return {
            ...openlvDetails,
            foo: 'bar',
            async connect() {
                log('connect');

                const modal = await getTriggerModal();

                console.log('loading modal');
                modal?.(provider);

                const modalDismissed = new Promise((_resolve) => {
                    // modal?.onClose
                    // resolve();
                });

                const connectionCompleted = new Promise((_resolve) => {
                    // modal?.onStartConnection
                    // resolve();
                });

                await Promise.race([modalDismissed, connectionCompleted]);

                // if sessions fails close modal

                return {
                    accounts: [],
                    chainId: 1,
                    provider,
                };
            },
            async disconnect() {
                log('disconnect');
            },
            async getAccounts() {
                log('getAccounts');

                return [];
            },
            async getChainId() {
                return 1;
            },
            async getProvider() {
                log('getProvider');

                return provider;
            },
            /**
             * Note on isAuthorized, upon page load `getProvider` is called, followed by `isAuthorized` if the result is true, the `connect` function is called.
             * This can be used for auto-reconnection / persistence if a connection exists.
             */
            async isAuthorized() {
                log('isAuthorized');

                return false;
            },
            async switchChain({ chainId }) {
                log('switchChain', chainId);

                // eslint-disable-next-line no-restricted-syntax
                const chain = chains.find((chain) => chain.id === chainId);

                if (!chain) throw new Error(`Chain ${chainId} not found`);

                // todo confirm with wallet

                return chain;
            },
            onAccountsChanged() {
                log('onAccountsChanged');
            },
            onChainChanged() {
                log('onChainChanged');
            },
            async onDisconnect() {
                log('onDisconnect');
            },
        };
        // return connectorActions({ ...openlvDetails, getProvider: () => provider });
    });
};
