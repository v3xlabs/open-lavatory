import type { ProviderStorage } from "@openlv/provider/storage";
import { useState } from "preact/hooks";

import { deepMerge } from "../utils/utils";
import { useEventEmitter } from "./useEventEmitter";
import { useProvider } from "./useProvider";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

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

  const updateSettings = (update: DeepPartial<ProviderStorage>) => {
    if (!settings) return;

    // TODO: replace with better merge
    const newSettings: ProviderStorage = deepMerge(settings, update);

    setSettings(newSettings);
    provider?.storage.setSettings(newSettings);
  };

  if (!settings) throw new Error("Settings not found");

  return { settings, updateSettings };
};
