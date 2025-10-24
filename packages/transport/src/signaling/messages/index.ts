export type SignalMessageBase<T extends string, P> = {
    type: T;
    payload: P;
    mailboxId: string;
    timestamp: number;
    senderId: string;
};

/**
 * Heartbeat message
 */
export type SignalMessagePing = SignalMessageBase<
    'ping',
    {
        mailboxId: string;
    }
>;

export type SignalMessagePubkey = SignalMessageBase<
    'pubkey',
    {
        publicKey: string;
        dAppInfo: {
            name: string;
            url: string;
            icon: string;
        };
    }
>;

export type SignalMessageHello = SignalMessageBase<
    'hello',
    {
        publicKey: string;
        walletInfo: {
            name: string;
            version: string;
            icon: string;
        };
    }
>;

export type SignalMessageWebRTCOffer = SignalMessageBase<
    'webrtc-offer',
    {
        type: 'offer';
        sdp: string;
    }
>;

export type SignalMessageWebRTCAnswer = SignalMessageBase<
    'webrtc-answer',
    {
        type: 'answer';
        sdp: string;
    }
>;

export type SignalMessageICECandidate = SignalMessageBase<
    'ice-candidate',
    {
        candidate: string;
        sdpMid: string;
        sdpMLineIndex: number;
    }
>;

export type SignalMessageData = SignalMessageBase<
    'data',
    {
        data: string;
    }
>;

export type SignalMessage =
    | SignalMessagePing
    | SignalMessagePubkey
    | SignalMessageHello
    | SignalMessageWebRTCOffer
    | SignalMessageWebRTCAnswer
    | SignalMessageICECandidate
    | SignalMessageData;
