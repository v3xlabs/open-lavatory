import type { ProviderStorage, ProviderStorageR } from "@openlv/provider/storage";
import {
  DEFAULT_SETTINGS,
  parseProviderStorage,
} from "@openlv/provider/storage";
import { EventEmitter } from "eventemitter3";

import { storage } from "#imports";

const STORAGE_KEY = "@openlv/connector/settings";
const settingsItem = storage.defineItem<string>(`local:${STORAGE_KEY}`);

/**
 * Implements ProviderStorageR directly on top of WXT storage.
 * WXT's watch() propagates changes across all extension contexts
 * (content script, popup, background) via chrome.storage events.
 */
export const createWxtProviderStorage = async (): Promise<ProviderStorageR> => {
  const raw = await settingsItem.getValue();
  let settings: ProviderStorage = raw ? parseProviderStorage(raw) : DEFAULT_SETTINGS;

  const emitter = new EventEmitter<{
    settings_change: (settings: ProviderStorage) => void;
  }>();

  settingsItem.watch((newValue) => {
    if (newValue) {
      try {
        settings = parseProviderStorage(newValue);
      }
      catch {
        // Keep last known good settings if persisted data is invalid.
      }
    }
    else {
      settings = DEFAULT_SETTINGS;
    }

    emitter.emit("settings_change", settings);
  });

  return {
    emitter,
    getSettings: () => settings,
    setSettings: (update: ProviderStorage) => {
      settings = update;
      settingsItem.setValue(JSON.stringify(update)).catch(() => {});
      emitter.emit("settings_change", update);
    },
  };
};
