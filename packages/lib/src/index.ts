import mqtt from 'mqtt';

export type PubSubPayload = {

};

export type ConnectionPayload = {
  sessionId: string;
  sharedKey: string;
};

export const contentTopic = ({ sessionId }: {sessionId: string}) => `/my/topic/goes/here/${sessionId}`;

// include 'wss://test.mosquitto.org:8081/mqtt' later
// openlv://{sessionId}?sharedKey={sharedKey}
// openlv://abcdefg?sharedKey=1234567890
export const decodeConnectionURL = (url: string): ConnectionPayload => {
  const [, sessionId, sharedKey] = url.split('?');

  return {
    sessionId,
    sharedKey,
  };
};

export const encodeConnectionURL = (payload: ConnectionPayload) => {
  return `openlv://${payload.sessionId}?sharedKey=${payload.sharedKey}`;
};


export const startConnection = (url?: string) => {
  const client = mqtt.connect(url ?? 'wss://test.mosquitto.org:8081/mqtt');

  return {
    client,
    // topic is the content topic
    subscribe: (topic: string, callback: mqtt.ClientSubscribeCallback) => {
      client.subscribe(topic, callback);
    },
    // topic is the content topic
    publish: (topic: string, message: string) => {
      client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('Error publishing message', err);
        }
      });
    },
  };
};