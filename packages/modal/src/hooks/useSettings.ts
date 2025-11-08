import type { ProviderStorage } from "@openlv/provider/storage";
import { useState } from "preact/hooks";

import { useEventEmitter } from "./useEventEmitter";
import { useProvider } from "./useProvider";

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

  if (!settings) throw new Error("Settings not found");

  return { settings, updateSignalingProtocol, updateSignalingServer };
};
