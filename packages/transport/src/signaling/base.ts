import { MaybePromise } from 'viem';

import { SignalingLayer } from './index.js';

export type SignalBaseProperties = {
    topic: string;
    url: string;
};

export type SignalingBaseLayer = {
    type: string;
    setup: () => MaybePromise<void>;
    teardown: () => MaybePromise<void>;
    publish: (payload: string) => MaybePromise<void>;
    subscribe: (handler: (payload: string) => void) => MaybePromise<void>;
};

export type SignalLayerCreator = (properties: SignalBaseProperties) => MaybePromise<SignalingLayer>;
