import { createLightNode, Protocols } from "@waku/sdk";

export const wakuNode = await createLightNode({
    defaultBootstrap: false,
    bootstrapPeers: [
        '/dns4/node-01.do-ams3.waku.sandbox.status.im/tcp/8000/wss'
    ],
    
})

export const pairExchange = async () => {
    await wakuNode.start()

    await wakuNode.waitForPeers([Protocols.LightPush, Protocols.Filter])

    const peers = wakuNode.libp2p.getPeers();
    console.log(
      "Peers:",
      peers.map((p: any) => p.toString())
    );
    
}