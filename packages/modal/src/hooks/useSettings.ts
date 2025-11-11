import type { ProviderStorage } from "@openlv/provider/storage";
import { useState } from "preact/hooks";

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

  const updateRetainHistory = (retainHistory: boolean) => {
    if (!settings) return;

    setSettings({ ...settings, retainHistory });
    provider?.storage.setSettings({ ...settings, retainHistory });
  };

  const updateAutoReconnect = (autoReconnect: boolean) => {
    if (!settings) return;

    setSettings({ ...settings, autoReconnect });
    provider?.storage.setSettings({ ...settings, autoReconnect });
  };

  if (!settings) throw new Error("Settings not found");

  return {
    settings,
    updateSignalingProtocol,
    updateSignalingServer,
    updateRetainHistory,
    updateAutoReconnect,
  };
};
