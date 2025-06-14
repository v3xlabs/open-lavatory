import { createConnector } from '@wagmi/core';
import type { Connector } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core/chains';
import type { Address, ProviderConnectInfo } from 'viem';
import { getAddress } from 'viem';
import * as QRCode from 'qrcode-generator';

import { OpenLVProvider } from 'lib/provider';

export interface OpenLVParameters {
    showQrModal?: boolean;
}

type OpenLVConnector = Connector & {
    onDisplayUri(uri: string): void;
};

// Lightweight QR Modal Web Component
class OpenLVModalElement extends HTMLElement {
    public shadowRoot: ShadowRoot;
    private uri: string = '';
    private onClose: () => void = () => {};

    constructor() {
        super();
        this.shadowRoot = this.attachShadow({ mode: 'closed' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setProps(uri: string, onClose: () => void) {
        this.uri = uri;
        this.onClose = onClose;
        if (this.isConnected) {
            this.render();
        }
    }

    private generateQRCode(text: string): string {
        const qr = QRCode.default(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createSvgTag(4, 0);
    }

    private render() {
        const qrSvg = this.generateQRCode(this.uri);
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .modal-content {
                    background: white;
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }

                .modal-title {
                    margin: 0 0 16px 0;
                    font-size: 24px;
                    color: #1f2937;
                    font-weight: 600;
                }

                .modal-subtitle {
                    margin: 0 0 24px 0;
                    color: #6b7280;
                    font-size: 14px;
                }

                .qr-container {
                    margin: 24px 0;
                    padding: 16px;
                    background: #f9fafb;
                    border-radius: 12px;
                }

                .qr-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0 auto;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 16px;
                    width: fit-content;
                    transition: filter 0.3s ease;
                    filter: blur(4px);
                    cursor: pointer;
                }

                .qr-wrapper:hover {
                    filter: blur(0px);
                }

                .qr-wrapper svg {
                    display: block;
                    width: 200px;
                    height: 200px;
                }

                .url-container {
                    background: #f3f4f6;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 16px 0;
                }

                .url-label {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: #374151;
                    font-weight: 600;
                }

                .url-text {
                    margin: 0;
                    font-size: 10px;
                    color: #6b7280;
                    word-break: break-all;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                }

                .cancel-button {
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 14px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }

                .cancel-button:hover {
                    background: #dc2626;
                }

                .protocol-badge {
                    margin: 16px 0 0 0;
                    font-size: 12px;
                    color: #9ca3af;
                }

                .blur-hint {
                    margin: 8px 0 0 0;
                    font-size: 11px;
                    color: #9ca3af;
                    font-style: italic;
                }
            </style>
            
            <div class="modal-content">
                <h2 class="modal-title">Connect OpenLV Wallet</h2>
                <p class="modal-subtitle">Scan QR code or copy URL to connect</p>
                
                <div class="qr-container">
                    <div class="qr-wrapper" title="Hover to reveal QR code">
                        ${qrSvg}
                    </div>
                    <p class="blur-hint">Hover to reveal QR code</p>
                </div>
                
                <div class="url-container">
                    <p class="url-label">Connection URL:</p>
                    <p class="url-text">${this.uri}</p>
                </div>
                
                <button class="cancel-button" id="cancel-btn">Cancel</button>
                
                <p class="protocol-badge">🔐 OpenLV Protocol</p>
            </div>
        `;
    }

    private setupEventListeners() {
        // Close on backdrop click
        this.addEventListener('click', (e) => {
            if (e.target === this) {
                this.onClose();
            }
        });

        // Close on cancel button
        const cancelBtn = this.shadowRoot.querySelector('#cancel-btn');
        cancelBtn?.addEventListener('click', () => {
            this.onClose();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.onClose();
            }
        });
    }
}

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