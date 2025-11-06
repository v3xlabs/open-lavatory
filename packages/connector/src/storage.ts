import type { ConnectorSettings, ConnectorStorage } from "@openlv/core";
import { EventEmitter } from "eventemitter3";

const DEFAULT_SETTINGS: ConnectorSettings = {
  session: {
    p: "mqtt",
    s: "",
  },
  autoReconnect: false,
  retainHistory: false,
};

const DEFAULT_STORAGE_KEY = "@openlv/connector/settings";

export type ConnectorStorageParameters = {
  // Defaults to localStorage
  storage?: Storage;
};

const createPassthrough = () => {
  const map = new Map<string, string>();

  return {
    getItem: (key: string) => {
      return map.get(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

const getStorage = () => {
  if (typeof window === "undefined") return undefined;

  if (!("localStorage" in window)) return undefined;

  return window.localStorage;
};

export const createConnectorStorage = ({
  storage,
}: ConnectorStorageParameters): ConnectorStorage => {
  const io = storage ?? getStorage() ?? createPassthrough();
  const initialSettings = io.getItem(DEFAULT_STORAGE_KEY);

  let settings: ConnectorSettings = initialSettings
    ? JSON.parse(initialSettings)
    : DEFAULT_SETTINGS;

  const emitter = new EventEmitter<{
    settings_change: (settings: ConnectorSettings) => void;
  }>();

  return {
    emitter,
    getSettings: () => settings,
    setSettings: (update: ConnectorSettings) => {
      settings = update;
      io.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(update));
      emitter.emit("settings_change", update);
    },
  };
};
