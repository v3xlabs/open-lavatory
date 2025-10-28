import { SignalingMode } from './base.js';

export type SignalingEvents = {
    state_change: (state: SignalingMode) => void;
};
