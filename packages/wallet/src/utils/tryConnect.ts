import {
  contentTopic,
  decodeConnectionURL,
  OpenLVConnection,
  startConnection,
} from 'lib'

export const tryConnect = async (result: { data: string }) => {
  try {
    const conn = new OpenLVConnection()

    conn.connectToSession({
      openLVUrl: result.data,
      onMessage: (message) => {
        console.log('Received message', message)
      },
    })
  } catch (error) {
    throw new Error(`Failed to pair with host: ${error}`, { cause: error })
  }
}
