import { createConnector } from '@wagmi/core';
import type { Connector } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core/chains';
import type { Address, ProviderConnectInfo } from 'viem';
import { getAddress } from 'viem';

import { OpenLVProvider } from 'lib/provider';
import { OpenLVModalElement } from './modal-component.js';

export interface OpenLVParameters {
    showQrModal?: boolean;
}

type OpenLVConnector = Connector & {
    onDisplayUri(uri: string): void;
};

// Register the custom element
if (!customElements.get('openlv-modal')) {
    customElements.define('openlv-modal', OpenLVModalElement);
}

openLvConnector.type = 'openLv' as const;

export function openLvConnector(parameters: OpenLVParameters = {}) {
    const showQrModal = parameters.showQrModal ?? true;

    type Provider = OpenLVProvider;
    type Properties = {
        connect(parameters?: { 
            chainId?: number | undefined;
            isReconnecting?: boolean | undefined;
        }): Promise<{ accounts: readonly Address[]; chainId: number }>;
        onConnect(connectInfo: ProviderConnectInfo): void;
        onDisplayUri(uri: string): void;
    };

    let provider_: Provider | undefined;
    let accounts: readonly Address[] = [];
    let currentChainId: number = mainnet.id;
    let isConnected = false;

    let connect: OpenLVConnector['onConnect'] | undefined;
    let displayUri: OpenLVConnector['onDisplayUri'] | undefined;
    let disconnect: OpenLVConnector['onDisconnect'] | undefined;
    let accountsChanged: OpenLVConnector['onAccountsChanged'] | undefined;
    let chainChanged: OpenLVConnector['onChainChanged'] | undefined;

    // Modal state
    let modalElement: OpenLVModalElement | null = null;

    return createConnector<Provider, Properties>((config) => ({
        id: 'openLv',
        name: 'OpenLV Protocol',
        type: openLvConnector.type,
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz48L3N2Zz4=',

        async setup() {
            const provider = await this.getProvider().catch(() => null);
            if (!provider) return;

            if (!connect) {
                connect = this.onConnect.bind(this);
                provider.on('connect', connect);
            }
        },

        async connect({ chainId, isReconnecting } = {}) {
            try {
                const provider = await this.getProvider();
                
                if (!displayUri) {
                    displayUri = this.onDisplayUri.bind(this);
                    provider.on('display_uri', displayUri);
                }

                // Determine target chain
                let targetChainId = chainId;
                if (!targetChainId) {
                    const state = (await config.storage?.getItem('state')) ?? {};
                    const isChainSupported = config.chains.some(
                        (x) => x.id === state.chainId,
                    );
                    if (isChainSupported) targetChainId = state.chainId;
                    else targetChainId = config.chains[0]?.id;
                }

                if (!targetChainId) throw new Error('No chains found on connector.');

                // Initialize OpenLV connection if not reconnecting or not connected
                if (!isReconnecting || !provider.connected) {
                    await provider.init();
                }

                // Wait for wallet connection and proper connection state
                const result = await new Promise<{ accounts: readonly Address[]; chainId: number }>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout after 60 seconds'));
                        cleanup();
                    }, 60000);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        provider.removeListener('message', handleMessage);
                        provider.removeListener('connect', handleConnect);
                        if (displayUri) {
                            provider.removeListener('display_uri', displayUri);
                            displayUri = undefined;
                        }
                    };

                    let connectionEstablished = false;
                    let accountsRequested = false;

                    const handleConnect = () => {
                        connectionEstablished = true;
                        console.log('OpenLV: Connection established, requesting accounts...');
                        
                        // Only request accounts once we have a proper connection
                        if (!accountsRequested) {
                            accountsRequested = true;
                            setTimeout(async () => {
                                try {
                                    await provider.request({
                                        method: 'eth_requestAccounts',
                                        params: undefined,
                                    });
                                } catch (error) {
                                    console.error('Failed to request accounts:', error);
                                    cleanup();
                                    reject(error);
                                }
                            }, 1000); // Give a bit more time for the connection to stabilize
                        }
                    };

                    const handleMessage = (message: any) => {
                        // Handle account response
                        if (message.method === 'eth_accounts' && message.result?.length > 0) {
                            cleanup();
                            
                            const newAccounts = message.result.map((addr: string) => getAddress(addr));
                            accounts = newAccounts;
                            currentChainId = targetChainId!;
                            isConnected = true;

                            closeOpenLVModal();

                            resolve({
                                accounts: newAccounts,
                                chainId: targetChainId!,
                            });
                        }
                        // Handle other responses that might contain account info
                        else if (message.result && Array.isArray(message.result) && message.result.length > 0) {
                            // Check if this looks like an account array
                            const firstItem = message.result[0];
                            if (typeof firstItem === 'string' && firstItem.startsWith('0x') && firstItem.length === 42) {
                                cleanup();
                                
                                const newAccounts = message.result.map((addr: string) => getAddress(addr));
                                accounts = newAccounts;
                                currentChainId = targetChainId!;
                                isConnected = true;

                                closeOpenLVModal();

                                resolve({
                                    accounts: newAccounts,
                                    chainId: targetChainId!,
                                });
                            }
                        }
                    };

                    provider.on('message', handleMessage);
                    provider.on('connect', handleConnect);

                    // If already connected, trigger the connect handler
                    if (provider.connected) {
                        handleConnect();
                    }
                });

                // Set up event listeners
                if (!accountsChanged) {
                    accountsChanged = this.onAccountsChanged.bind(this);
                    provider.on('accountsChanged', accountsChanged);
                }

                if (!chainChanged) {
                    chainChanged = this.onChainChanged.bind(this);
                    provider.on('chainChanged', chainChanged);
                }

                if (!disconnect) {
                    disconnect = this.onDisconnect.bind(this);
                    provider.on('disconnect', disconnect);
                }

                return result;
            } catch (error) {
                console.error('OpenLV connection failed:', error);
                closeOpenLVModal();
                throw error;
            }
        },

        async disconnect() {
            const provider = await this.getProvider();
            
            try {
                provider?.disconnect();
            } catch (error) {
                console.error('Disconnect error:', error);
            } finally {
                // Clean up event listeners
                if (accountsChanged) {
                    provider?.removeListener('accountsChanged', accountsChanged);
                    accountsChanged = undefined;
                }
                if (chainChanged) {
                    provider?.removeListener('chainChanged', chainChanged);
                    chainChanged = undefined;
                }
                if (disconnect) {
                    provider?.removeListener('disconnect', disconnect);
                    disconnect = undefined;
                }

                accounts = [];
                isConnected = false;
                currentChainId = mainnet.id;
                provider_ = undefined;
                closeOpenLVModal();
            }
        },

        async getAccounts() {
            return accounts;
        },

        async getProvider() {
            if (!provider_) {
                provider_ = new OpenLVProvider();
            }
            return provider_;
        },

        async getChainId() {
            return currentChainId;
        },

        async isAuthorized() {
            try {
                return isConnected && accounts.length > 0;
            } catch {
                return false;
            }
        },

        async switchChain({ chainId: newChainId }: { chainId: number }) {
            const chain = config.chains.find((x) => x.id === newChainId);
            if (!chain) throw new Error(`Chain ${newChainId} not configured`);

            const provider = await this.getProvider();
            if (!provider) throw new Error('Provider not connected');

            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${newChainId.toString(16)}` }],
                });

                currentChainId = newChainId;
                config.emitter.emit('change', { chainId: newChainId });
                
                return chain;
            } catch (error) {
                throw new Error(`Failed to switch chain: ${error}`);
            }
        },

        onAccountsChanged(accounts: string[]) {
            if (accounts.length === 0) {
                this.onDisconnect();
            } else {
                const addresses = accounts.map((addr) => getAddress(addr));
                config.emitter.emit('change', { accounts: addresses });
            }
        },

        onChainChanged(chainId: string | number) {
            const newChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId);
            currentChainId = newChainId;
            config.emitter.emit('change', { chainId: newChainId });
        },

        async onConnect(connectInfo?: ProviderConnectInfo) {
            const chainId = connectInfo?.chainId ? Number(connectInfo.chainId) : currentChainId;
            currentChainId = chainId;
            const currentAccounts = await this.getAccounts();
            config.emitter.emit('connect', { accounts: currentAccounts, chainId });
        },

        async onDisconnect() {
            accounts = [];
            isConnected = false;
            currentChainId = mainnet.id;
            config.emitter.emit('disconnect');
        },

        onDisplayUri(uri: string) {
            if (showQrModal) {
                showOpenLVModal(uri);
            }
            config.emitter.emit('message', { type: 'display_uri', data: uri });
        },
    }));

    // Web Component Modal functions
    function showOpenLVModal(uri: string) {
        closeOpenLVModal();

        modalElement = new OpenLVModalElement();
        modalElement.setProps(uri, closeOpenLVModal);
        document.body.appendChild(modalElement);
    }

    function closeOpenLVModal() {
        if (modalElement) {
            document.body.removeChild(modalElement);
            modalElement = null;
        }
    }
} 