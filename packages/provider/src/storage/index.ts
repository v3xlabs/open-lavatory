import { EventEmitter } from "eventemitter3";

import { DEFAULT_SETTINGS } from "./default.js";
import { parseProviderStorage, type ProviderStorage } from "./version.js";

const DEFAULT_STORAGE_KEY = "@openlv/connector/settings";

export type {
  ProviderStorage,
  TurnServer,
  UserThemePreference,
} from "./version.js";

export type ProviderStorageParameters = {
  // Defaults to localStorage
  storage?: Storage;
};

/**
 * Creates a synchronous in-memory Storage adapter.
 * Useful when localStorage is unavailable (e.g. extension injected scripts).
 *
 * @param initial - Pre-populated key/value pairs (e.g. from a prior async load).
 * @param onWrite - Called synchronously after every setItem, useful for
 *                  persisting writes to an async backing store.
 */
export const createSyncStorage = (
  initial?: Record<string, string>,
  onWrite?: (key: string, value: string) => void,
): Storage => {
  const map = new Map(Object.entries(initial ?? {}));

  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
      onWrite?.(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    get length() {
      return map.size;
    },
    key: n => [...map.keys()][n] ?? null,
  };
};

const createPassthrough = () => createSyncStorage();

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
