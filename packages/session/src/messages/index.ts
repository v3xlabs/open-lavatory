export type SessionMessage =
  | SessionMessageRequest
  | SessionMessageResponse
  | SessionMessageAck;

export type SessionMessageRequest = {
  type: "request";
  messageId: string;
  payload: object | string;
};

export type SessionMessageResponse = {
  type: "response";
  messageId: string;
  payload: object | string;
};

/**
 * Sent immediately by the receiver of a request to confirm receipt.
 * Allows the dApp to distinguish "wallet unreachable" from
 * "wallet received and is processing (e.g. waiting for user approval)".
 */
export type SessionMessageAck = {
  type: "ack";
  messageId: string;
};
