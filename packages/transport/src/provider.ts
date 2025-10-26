/* eslint-disable sonarjs/no-duplicate-string */
import { EventEmitter } from 'eventemitter3';
import type { EIP1193Parameters, EIP1474Methods } from 'viem';

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
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'disconnected') {
                this.#isConnected = false;
                this.emit('disconnect');
            }
        });

        // Set up message handler for incoming JSON-RPC messages
        this.#conn.onMessage(async (message: JsonRpcRequest | JsonRpcResponse) => {
            console.log('Provider: Received message:', message);

            // **FIX: Always emit the message first**
            this.emit('message', message);

            // Handle responses to our requests (but don't interfere with request handlers)
            if ('result' in message || 'error' in message) {
                const response = message as JsonRpcResponse;

                console.log('Provider: Processing response:', response);

                // Check for account changes and update internal state
                if (response.result && Array.isArray(response.result)) {
                    const newAccounts = response.result;

                    console.log('Provider: Found accounts in response:', newAccounts);

                    // Update accounts but don't emit here - let the request handler do it
                    const oldAccounts = this.#accounts;

                    this.#accounts = newAccounts;

                    // Only emit if accounts actually changed
                    if (JSON.stringify(oldAccounts) !== JSON.stringify(newAccounts)) {
                        console.log('Provider: Emitting accountsChanged:', newAccounts);
                        this.emit('accountsChanged', newAccounts);
                    }
                }

                // Return the response for request handlers
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
                this.#isConnected = true;
                this.emit('connect');
            } else if (phase.state === 'disconnected') {
                this.#isConnected = false;
                this.emit('disconnect');
            }
        });

        // Set up message handler
        this.#conn.onMessage(async (message: JsonRpcRequest | JsonRpcResponse) => {
            console.log('Provider: Received message:', message);

            // **FIX: Always emit the message first**
            this.emit('message', message);

            // Handle responses to our requests
            if ('result' in message || 'error' in message) {
                const response = message as JsonRpcResponse;

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

        console.log('Provider: Sending request:', jsonRpcRequest);

        // Send the request
        await this.#conn.sendMessage(jsonRpcRequest);

        // For some methods, we can return immediately or simulate responses
        switch (params.method) {
            case 'eth_requestAccounts':
                // This will be handled by the wallet, so we need to wait for response
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.removeListener('message', handleResponse);
                        console.log('Provider: Request timeout for eth_requestAccounts');
                        reject(new Error('Request timeout'));
                    }, 30000);

                    const handleResponse = (message: any) => {
                        console.log(
                            'Provider: Checking response for eth_requestAccounts:',
                            message
                        );
                        console.log(
                            'Provider: Request ID:',
                            jsonRpcRequest.id,
                            'Response ID:',
                            message.id
                        );
                        console.log('Provider: Response structure:', {
                            hasId: 'id' in message,
                            hasResult: 'result' in message,
                            hasError: 'error' in message,
                            hasMethod: 'method' in message,
                            resultType: typeof message.result,
                            isArray: Array.isArray(message.result),
                            resultLength: Array.isArray(message.result)
                                ? message.result.length
                                : 'N/A',
                        });

                        // Check if this is the response to our request
                        if (message.id === jsonRpcRequest.id) {
                            console.log('Provider: ID match - processing response');

                            if (message.error) {
                                console.log('Provider: Error in response:', message.error);
                                clearTimeout(timeout);
                                this.removeListener('message', handleResponse);
                                reject(new Error(message.error.message));
                            } else if ('result' in message && Array.isArray(message.result)) {
                                // Validate that these are proper Ethereum addresses
                                const accounts = message.result;
                                const isValidAccounts =
                                    accounts.length > 0 &&
                                    accounts.every((addr: any) => {
                                        if (typeof addr !== 'string') return false;

                                        if (!addr.startsWith('0x')) return false;

                                        if (addr.length !== 42) return false;

                                        // Basic hex validation
                                        return /^0x[0-9a-fA-F]{40}$/.test(addr);
                                    });

                                if (isValidAccounts) {
                                    console.log(
                                        'Provider: Valid account array found:',
                                        message.result
                                    );
                                    clearTimeout(timeout);
                                    this.removeListener('message', handleResponse);
                                    this.#accounts = message.result;
                                    console.log('Provider: Updated accounts:', this.#accounts);
                                    resolve(message.result);
                                } else {
                                    console.log(
                                        'Provider: Invalid addresses in response:',
                                        message.result
                                    );
                                    console.log(
                                        'Provider: Address validation failed - ignoring this response'
                                    );
                                    // Don't resolve/reject yet - wait for a valid response
                                }
                            } else if ('result' in message) {
                                console.log('Provider: Non-array result found:', message.result);
                                // Don't resolve for non-array results like {status: 'processing'}
                                // Keep waiting for the actual account array
                                console.log('Provider: Waiting for account array response...');
                            } else {
                                console.log('Provider: Invalid response format - missing result');
                                console.log(
                                    'Provider: Full message:',
                                    JSON.stringify(message, null, 2)
                                );
                                // Don't reject immediately - wallet might send another response
                                console.log('Provider: Continuing to wait for valid response...');
                            }
                        } else {
                            console.log('Provider: Message ID mismatch - ignoring');
                            console.log(
                                'Provider: Expected:',
                                jsonRpcRequest.id,
                                'Got:',
                                message.id
                            );
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
                        console.log('Provider: Default handler - checking response:', message);

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
