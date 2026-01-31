import type { ProviderStorage } from "@openlv/provider/storage";
import { addToHistory, removeFromHistory } from "@openlv/provider/storage";
import { useState } from "preact/hooks";

import type { LanguageTag } from "../utils/i18n.js";
import { useEventEmitter } from "./useEventEmitter.js";
import { useProvider } from "./useProvider.js";

export const useSettings = () => {
  const { provider } = useProvider();
  const [settings, setSettings] = useState<ProviderStorage | undefined>(
    provider?.storage.getSettings(),
  );

  useEventEmitter(
    provider?.storage.emitter,
    "settings_change",
    (newSettings) => {
      setSettings(newSettings);
    },
  );

  const updateSignalingProtocol = (update: string) => {
    if (!settings) return;

    if (settings.signaling?.p === update) return;

    const newSettings = {
      ...settings,
      signaling: {
        ...settings.signaling,
        p: update,
      },
    };

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const updateSignalingServer = (server: string) => {
    if (!settings) return;

    if (settings.signaling?.s[settings.signaling?.p] === server) return;

    const newSettings = {
      ...settings,
      signaling: {
        ...settings.signaling,
        s: {
          ...settings.signaling.s,
          [settings.signaling.p]: server,
        },
      },
    };

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const commitServerToHistory = (server?: string) => {
    if (!settings) return;

    if (!settings.retainHistory) return;

    const currentProtocol = settings.signaling.p;
    const url = server ?? settings.signaling.s[currentProtocol] ?? "";

    if (!url.trim()) return;

    const protocolHistory =
      settings.signaling.lastUsed?.[currentProtocol] || [];
    const updatedHistory = addToHistory(protocolHistory, url);

    const newSettings = {
      ...settings,
      signaling: {
        ...settings.signaling,
        lastUsed: {
          ...settings.signaling.lastUsed,
          [currentProtocol]: updatedHistory,
        },
      },
    };

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const removeServerFromHistory = (urlToRemove: string) => {
    if (!settings) return;

    const currentProtocol = settings.signaling.p;
    const protocolHistory =
      settings.signaling.lastUsed?.[currentProtocol] || [];
    const updatedHistory = removeFromHistory(protocolHistory, urlToRemove);

    const newSettings = {
      ...settings,
      signaling: {
        ...settings.signaling,
        lastUsed: {
          ...settings.signaling.lastUsed,
          [currentProtocol]: updatedHistory,
        },
      },
    };

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const updateRetainHistory = (retainHistory: boolean) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      retainHistory,
      signaling: {
        ...settings.signaling,
        lastUsed: retainHistory ? settings.signaling.lastUsed : {},
      },
    };

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  const updateAutoReconnect = (autoReconnect: boolean) => {
    if (!settings) return;

    setSettings({ ...settings, autoReconnect });
    provider?.storage.setSettings({ ...settings, autoReconnect });
  };

  const updateLanguage = (language: LanguageTag) => {
    if (!settings) return;

    setSettings({ ...settings, language });
    provider?.storage.setSettings({ ...settings, language });
  };

  if (!settings) throw new Error("Settings not found");

  return {
    settings,
    updateSignalingProtocol,
    updateSignalingServer,
    commitServerToHistory,
    removeServerFromHistory,
    updateRetainHistory,
    updateAutoReconnect,
    updateLanguage,
  };
};
