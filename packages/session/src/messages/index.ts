export type SessionMessage = SessionMessageRequest | SessionMessageResponse;

export type SessionMessageRequest = {
  type: "request";
  messageId: string;
  payload: object;
};

export type SessionMessageResponse = {
  type: "response";
  messageId: string;
  payload: object;
};
