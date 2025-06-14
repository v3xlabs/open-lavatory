import {
  createDecoder,
  createEncoder,
  createLightNode,
  DecodedMessage,
  LightNode,
  Protocols,
} from '@waku/sdk'

export const createWakuNode = () =>
  createLightNode({
    defaultBootstrap: false,
    bootstrapPeers: [
      '/dns4/node-01.do-ams3.waku.sandbox.status.im/tcp/8000/wss',
    ],
  })

export async function sendMessage(
  { node, contentTopic, message }: {
    node: LightNode
    contentTopic: string
    message: string
  },
) {
  if (!node || !node.isStarted()) {
    console.error('Waku node not started')
    return
  }

  const encoder = createEncoder({ contentTopic, ephemeral: true })
  const serialisedMessage = new TextEncoder().encode(
    JSON.stringify({ msg: message }),
  )

  try {
    await node.lightPush.send(encoder, { payload: serialisedMessage })
    console.log('Message sent:', message)
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}

// Subscribe to incoming messages
export async function subscribeToMessages(
  { node, contentTopic, cb }: {
    node: LightNode
    contentTopic: string
    cb: (message: DecodedMessage) => void
  },
) {
  if (!node || !node.isStarted()) {
    console.error('Waku node not started')
    return
  }

  const decoder = createDecoder(contentTopic)
  const callback = (wakuMessage: DecodedMessage) => {
    if (!wakuMessage.payload) return
    const messageObj = JSON.parse(
      new TextDecoder().decode(wakuMessage.payload),
    )
    console.log('Received message:', messageObj)
    // Send received message to frontend
    cb(wakuMessage)
  }

  try {
    const { error, subscription } = await node.filter.subscribe(
      decoder,
      callback,
    )
    if (error || !subscription) {
      console.error('Subscription error:', error)
    } else {
      console.log('Subscribed to messages')
    }
  } catch (error) {
    console.error('Subscription failed:', error)
  }
}

export const pairExchange = async (node: LightNode) => {
  await node.start()

  await node.waitForPeers([Protocols.LightPush, Protocols.Filter])

  return node
}
