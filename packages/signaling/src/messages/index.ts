export type SignalMessageBase<T extends string, P> = {
  type: T;
  payload: P;
  timestamp: number;
};

/**
 * Flash message
 * Sent to initiate handshake by non-host
 */
export type SignalMessageFlash = SignalMessageBase<"flash", object>;

export type SignalMessagePubkey = SignalMessageBase<
  "pubkey",
  {
    publicKey: string;
    dAppInfo?: {
      name: string;
      url: string;
      icon: string;
    };
  }
>;

export type SignalMessageAck = SignalMessageBase<"ack", undefined>;

export type SignalMessageData = SignalMessageBase<"data", object>;

export type SignalMessage =
  | SignalMessageFlash
  | SignalMessagePubkey
  | SignalMessageAck
  | SignalMessageData;
