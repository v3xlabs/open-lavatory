import type { ConnectorSettings } from "@openlv/core";
import { useState } from "preact/hooks";

import { useEventEmitter } from "./useEventEmitter";
import { useProvider } from "./useProvider";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const useSettings = () => {
  const { storage } = useProvider();
  const [settings, setSettings] = useState<ConnectorSettings | undefined>(
    storage?.getSettings(),
  );

  useEventEmitter(storage?.emitter, "settings_change", (newSettings) => {
    setSettings(newSettings);
  });

  const updateSettings = (update: DeepPartial<ConnectorSettings>) => {
    if (!settings) return;

    // TODO: replace with better merge
    const newSettings = {
      ...settings,
      ...update,
      session: {
        ...(settings?.session || {}),
        ...(update.session || {}),
      },
    };

    setSettings(newSettings);
    storage?.setSettings(newSettings);
  };

  return { settings, updateSettings };
};
