export type PubSubPayload = {

};

export type ConnectionPayload = {
  sessionId: string;
  sharedKey: string;
};

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