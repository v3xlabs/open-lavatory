import { createMemo } from "solid-js";

import { useSettings } from "./useSettings.js";

export const useTheme = () => {
  const { settings } = useSettings();

  const theme = createMemo(() => settings().theme);
  const mode = createMemo(() => "light");

  return {
    theme,
    mode,
  };
};
