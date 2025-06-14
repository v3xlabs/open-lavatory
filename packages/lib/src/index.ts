export type PubSubPayload = {

};

export type ConnectionPayload = {
  sessionId: string;
  sharedKey: string;
};

export const contentTopic = (v: string) => `/my/topic/goes/here/${v}`;

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