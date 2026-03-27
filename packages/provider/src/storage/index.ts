import { EventEmitter } from "eventemitter3";

import { DEFAULT_SETTINGS } from "./default.js";
import { parseProviderStorage, type ProviderStorage } from "./version.js";

const DEFAULT_STORAGE_KEY = "@openlv/connector/settings";

export { DEFAULT_SETTINGS } from "./default.js";
export type {
  ProviderStorage,
  TurnServer,
  UserThemePreference,
} from "./version.js";
export { parseProviderStorage } from "./version.js";

export type ProviderStorageParameters = {
  // Defaults to localStorage
  storage?: Storage;
};

const createPassthrough = () => {
  const map = new Map<string, string>();

  return {
    getItem: (key: string) => map.get(key),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

const getStorage = () => {
  if (globalThis.window === undefined) return;

  if (!("localStorage" in globalThis)) return;

  return globalThis.localStorage;
};

export type ProviderStorageR = {
  emitter: EventEmitter<{
    settings_change: (settings: ProviderStorage) => void;
  }>;
  getSettings: () => ProviderStorage;
  setSettings: (update: ProviderStorage) => void;
};

export const createProviderStorage = ({
  storage: storageBackend,
}: ProviderStorageParameters): ProviderStorageR => {
  const io = storageBackend ?? getStorage() ?? createPassthrough();

  const getSettings = () => {
    const raw = io.getItem(DEFAULT_STORAGE_KEY);

    return raw ? parseProviderStorage(raw) : DEFAULT_SETTINGS;
  };

  const emitter = new EventEmitter<{
    settings_change: (settings: ProviderStorage) => void;
  }>();

  return {
    emitter,
    getSettings,
    setSettings: (update: ProviderStorage) => {
      io.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(update));
      emitter.emit("settings_change", update);
    },
  };
};
