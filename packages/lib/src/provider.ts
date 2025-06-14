import { EventEmitter } from 'eventemitter3';
import type { EIP1193Parameters, EIP1474Methods } from 'viem';

import { OpenLVConnection } from './index.js';

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
        this.#conn?.connectToSession({
            openLVUrl: uri,
            onMessage: (message) => {
                this.emit('message', message);
            },
        });
    }
    disconnect() {
        this.#conn?.disconnect();
    }
    request({ method }: EIP1193Parameters<EIP1474Methods>) {
        switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
                this.#conn?.sendMessage('eth_accounts');
        }
    }
}
