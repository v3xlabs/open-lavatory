import { createConnector } from '@wagmi/core';
import type { Connector } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core/chains';
import type { Address, ProviderConnectInfo } from 'viem';
import { getAddress } from 'viem';

import { OpenLVProvider } from 'lib/provider';

export interface OpenLVParameters {
    showQrModal?: boolean;
}

type OpenLVConnector = Connector & {
    onDisplayUri(uri: string): void;
};

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

                // Wait for wallet connection
                const result = await new Promise<{ accounts: readonly Address[]; chainId: number }>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout after 60 seconds'));
                        cleanup();
                    }, 60000);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        provider.removeListener('message', handleMessage);
                        if (displayUri) {
                            provider.removeListener('display_uri', displayUri);
                            displayUri = undefined;
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

                    // Request accounts after a short delay
                    setTimeout(async () => {
                        try {
                            await provider.request({
                                method: 'eth_requestAccounts',
                                params: undefined,
                            });
                        } catch (error) {
                            cleanup();
                            reject(error);
                        }
                    }, 2000);
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

        async onConnect(connectInfo: ProviderConnectInfo) {
            const chainId = Number(connectInfo.chainId);
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
}

// Simple QR Modal
function showOpenLVModal(uri: string) {
    closeOpenLVModal();

    const modal = document.createElement('div');
    modal.id = 'openlv-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center;
        z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 32px; max-width: 400px; width: 90%; text-align: center;">
            <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1f2937;">Connect OpenLV Wallet</h2>
            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">Scan QR code or copy URL to connect</p>
            
            <div style="margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 12px;">
                <div style="width: 200px; height: 200px; margin: 0 auto; background: white; border: 2px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280;">
                    📱 QR Code Here
                </div>
            </div>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #374151; font-weight: 600;">Connection URL:</p>
                <p style="margin: 0; font-size: 10px; color: #6b7280; word-break: break-all; font-family: monospace;">${uri}</p>
            </div>
            
            <button id="close-openlv-modal" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; cursor: pointer;">Cancel</button>
            
            <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">🔐 OpenLV Protocol</p>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-openlv-modal')?.addEventListener('click', closeOpenLVModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOpenLVModal();
    });
}

function closeOpenLVModal() {
    const modal = document.getElementById('openlv-modal');
    if (modal) modal.remove();
} 