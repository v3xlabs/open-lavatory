export type SessionMessage =
  | SessionMessageRequest
  | SessionMessageResponse
  | SessionMessageTransport;

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

export type SessionMessageTransport = {
  type: "transport";
  messageId: string;
  payload: {
    transport: "webrtc";
    signal:
      | { op: "offer"; sdp: RTCSessionDescriptionInit }
      | { op: "answer"; sdp: RTCSessionDescriptionInit }
      | { op: "ice"; candidate: RTCIceCandidateInit };
  };
};
