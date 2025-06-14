import { contentTopic, decodeConnectionURL, startConnection } from "lib"

export const tryConnect = async (result: unknown) => {
    try {
        const {sessionId, sharedKey } = decodeConnectionURL(result as string)
       
        const topic = contentTopic({sessionId})


        const client = startConnection()

        client.subscribe(topic, (err, granted) => {
            if (err) {
                console.error('Error subscribing to topic', err);
            }

            console.log('Subscribed to topic', topic, granted);
        });
    } catch (error) {
        throw new Error(`Failed to pair with host: ${error}`, {cause: error})
    }
}