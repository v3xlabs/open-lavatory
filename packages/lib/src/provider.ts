import { EventEmitter } from "eventemitter3";
import { OpenLVConnection } from "./index.js";
import type { EIP1193Provider } from "viem";

export class OpenLVProvider extends EventEmitter<'display_uri'> {
    #conn: OpenLVConnection | undefined
    constructor() {
        super();
    }
    async init() {
       this.#conn = new OpenLVConnection()
       const { openLVUrl } = await this.#conn.initSession()

       this.emit('display_uri', openLVUrl)
    }
}

// export class OpenLVEthereumProvider extends OpenLVProvider implements EIP1193Provider {
//     constructor() {
//         super()
//     }
//     request() {

//     }
// }