import { EventEmitter } from 'eventemitter3';

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
}
