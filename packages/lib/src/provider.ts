import { EventEmitter } from 'eventemitter3';
import type { EIP1193Parameters, EIP1474Methods } from 'viem';

import { OpenLVConnection } from './index.js';
import type { JsonRpcRequest } from './types.js';

export class OpenLVProvider extends EventEmitter<'display_uri' | 'message'> {
    #conn: OpenLVConnection | undefined;
    constructor() {
        super();
    }
    async init() {
        this.#conn = new OpenLVConnection();
        const { openLVUrl } = await this.#conn.initSession();

        this.emit('display_uri', openLVUrl);
    }
    async connect(uri: string) {
        this.#conn = new OpenLVConnection();

        // Set up message handler
        this.#conn.onMessage((request: JsonRpcRequest) => {
            this.emit('message', request);
        });

        await this.#conn.connectToSession(uri);
    }
    disconnect() {
        this.#conn?.disconnect();
    }
    request(params: EIP1193Parameters<EIP1474Methods>) {
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

        this.#conn.sendMessage(jsonRpcRequest);
    }
}
