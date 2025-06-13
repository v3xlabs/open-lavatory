import { wakuNode } from "./waku"

export const tryConnect = async (result: unknown) => {
    try {
        const offer: RTCSessionDescriptionInit = JSON.parse(result as string)
        const pc = new RTCPeerConnection()  

        await pc.setRemoteDescription(offer)

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)


    } catch (error) {
        throw new Error(`Failed to pair with host: ${error}`, {cause: error})
    }
}