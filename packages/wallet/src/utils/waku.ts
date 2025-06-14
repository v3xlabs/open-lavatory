import { createLightNode } from "@waku/sdk";

export const wakuNode = await createLightNode({
    defaultBootstrap: false,
    bootstrapPeers: [
        '/dns4/node-01.do-ams3.waku.sandbox.status.im/tcp/8000/wss'
    ],
    
})

await wakuNode.start()


await wakuNode.waitForPeers()
