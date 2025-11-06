import type { EventEmitter } from "eventemitter3";

import type { SessionCreationParameters } from "./session.js";

export type SignalingSettings = SessionCreationParameters;

export type ConnectorSettings = {
  retainHistory: boolean;
  autoReconnect: boolean;
  session: SignalingSettings;
  // transport: TransportSettings;
};

export type ConnectorStorage = {
  emitter: EventEmitter<{
    settings_change: (settings: ConnectorSettings) => void;
  }>;
  getSettings: () => ConnectorSettings;
  setSettings: (settings: ConnectorSettings) => void;
};
