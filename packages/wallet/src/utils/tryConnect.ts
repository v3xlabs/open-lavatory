import { OpenLVConnection } from 'lib'

export const tryConnect = async (result: { data: string }) => {
  try {
    const conn = new OpenLVConnection()

    conn.connectToSession({
      openLVUrl: result.data,
      onMessage: (message) => {
        const pc = new RTCPeerConnection()
      },
    })
  } catch (error) {
    throw new Error(`Failed to pair with host: ${error}`, { cause: error })
  }
}
