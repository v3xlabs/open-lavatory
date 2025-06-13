import { createLightNode } from "@waku/sdk";

export const wakuNode = await createLightNode({
    defaultBootstrap: true,
})

await wakuNode.start()


await wakuNode.waitForPeers()


console.log(await wakuNode.getConnectedPeers())