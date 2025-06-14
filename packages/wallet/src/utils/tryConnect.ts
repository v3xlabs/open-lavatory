import { contentTopic, decodeConnectionURL } from "lib"

export const tryConnect = async (result: unknown) => {
    try {
        const {sessionId, sharedKey } = decodeConnectionURL(result as string)
       
        const topic = contentTopic(sessionId)

    } catch (error) {
        throw new Error(`Failed to pair with host: ${error}`, {cause: error})
    }
}