import { EventEmitter } from 'eventemitter3';
import type { EIP1193Parameters, EIP1474Methods } from 'viem';

import { OpenLVConnection } from './index.js';
import type { JsonRpcRequest, JsonRpcResponse } from './types.js';

export class OpenLVProvider extends EventEmitter<
    'display_uri' | 'message' | 'connect' | 'disconnect' | 'accountsChanged' | 'chainChanged'
> {
    #conn: OpenLVConnection | undefined;
    #isConnected = false;
    #accounts: string[] = [];
    #chainId: number = 1;

    constructor() {
        super();
    }

    get connected() {
        return this.#isConnected;
    }

    async init() {
        this.#conn = new OpenLVConnection();

        // Set up connection handlers
        this.#conn.onPhaseChange((phase) => {
            console.log(`OpenLV Provider: Connection state changed to ${phase.state}`);

            if (phase.state === 'webrtc-connected') {
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'key-exchange') {
                // We can also send messages via encrypted MQTT once we have the peer's public key
                // This happens before WebRTC is established
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'disconnected') {
                this.#isConnected = false;
                this.emit('disconnect');
            }
        });

        // Set up message handler for incoming JSON-RPC messages
        this.#conn.onMessage(async (request: JsonRpcRequest) => {
            this.emit('message', request);

            // Handle responses to our requests
            if ('result' in request || 'error' in request) {
                const response = request as any as JsonRpcResponse;

                // Check for account changes
                if (response.result && Array.isArray(response.result)) {
                    const newAccounts = response.result;

                    if (JSON.stringify(newAccounts) !== JSON.stringify(this.#accounts)) {
                        this.#accounts = newAccounts;
                        this.emit('accountsChanged', newAccounts);
                    }
                }

                return response;
            }

            // For incoming requests, return a default response
            return { status: 'received' };
        });

        const { openLVUrl } = await this.#conn.initSession();

        this.emit('display_uri', openLVUrl);
    }

    async connect(uri: string) {
        this.#conn = new OpenLVConnection();

        // Set up connection handlers
        this.#conn.onPhaseChange((phase) => {
            console.log(`OpenLV Provider: Connection state changed to ${phase.state}`);

            if (phase.state === 'webrtc-connected') {
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'key-exchange') {
                // We can also send messages via encrypted MQTT once we have the peer's public key
                // This happens before WebRTC is established
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'disconnected') {
                this.#isConnected = false;
                this.emit('disconnect');
            }
        });

        // Set up message handler
        this.#conn.onMessage(async (request: JsonRpcRequest) => {
            this.emit('message', request);

            // Handle responses to our requests
            if ('result' in request || 'error' in request) {
                const response = request as any as JsonRpcResponse;

                // Check for account changes
                if (response.result && Array.isArray(response.result)) {
                    const newAccounts = response.result;

                    if (JSON.stringify(newAccounts) !== JSON.stringify(this.#accounts)) {
                        this.#accounts = newAccounts;
                        this.emit('accountsChanged', newAccounts);
                    }
                }

                return response;
            }

            // For incoming requests, return a default response
            return { status: 'received' };
        });

        await this.#conn.connectToSession(uri);
    }

    disconnect() {
        this.#conn?.disconnect();
        this.#isConnected = false;
        const oldAccounts = this.#accounts;

        this.#accounts = [];

        // Emit account change event if there were accounts
        if (oldAccounts.length > 0) {
            this.emit('accountsChanged', []);
        }

        this.emit('disconnect');
    }

    async request(params: EIP1193Parameters<EIP1474Methods>): Promise<any> {
        if (!this.#conn) {
            throw new Error('Connection not established');
        }

        // Convert to JSON-RPC request format
        const jsonRpcRequest: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: params.method,
            params: params.params ? Array.from(params.params as any[]) : [],
        };

        // Send the request
        await this.#conn.sendMessage(jsonRpcRequest);

        // For some methods, we can return immediately or simulate responses
        switch (params.method) {
            case 'eth_requestAccounts':
                // This will be handled by the wallet, so we need to wait for response
                return new Promise((resolve) => {
                    const handleResponse = (message: any) => {
                        if (message.method === 'eth_accounts' && message.result) {
                            this.#accounts = message.result;
                            this.removeListener('message', handleResponse);
                            resolve(message.result);
                        }
                    };

                    this.on('message', handleResponse);
                });

            case 'eth_accounts':
                return this.#accounts;

            case 'eth_chainId':
                return `0x${this.#chainId.toString(16)}`;

            case 'wallet_switchEthereumChain': {
                // Handle chain switching
                const chainIdParam = (params.params as any)?.[0]?.chainId;

                if (chainIdParam) {
                    const newChainId =
                        typeof chainIdParam === 'string'
                            ? parseInt(chainIdParam, 16)
                            : Number(chainIdParam);

                    if (newChainId !== this.#chainId) {
                        this.#chainId = newChainId;
                        this.emit('chainChanged', chainIdParam);
                    }
                }

                // Continue with the default case to send the request
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.removeListener('message', handleResponse);
                        reject(new Error('Request timeout'));
                    }, 10000);

                    const handleResponse = (message: any) => {
                        if (message.id === jsonRpcRequest.id) {
                            clearTimeout(timeout);
                            this.removeListener('message', handleResponse);

                            if (message.error) {
                                reject(new Error(message.error.message));
                            } else {
                                resolve(message.result);
                            }
                        }
                    };

                    this.on('message', handleResponse);
                });
            }

            default:
                // For other methods, wait for response
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.removeListener('message', handleResponse);
                        reject(new Error('Request timeout'));
                    }, 10000);

                    const handleResponse = (message: any) => {
                        if (message.id === jsonRpcRequest.id) {
                            clearTimeout(timeout);
                            this.removeListener('message', handleResponse);

                            if (message.error) {
                                reject(new Error(message.error.message));
                            } else {
                                resolve(message.result);
                            }
                        }
                    };

                    this.on('message', handleResponse);
                });
        }
    }
}
