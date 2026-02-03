import { useModalContext } from "../context.js";
import type { ThemeMode, UserThemePreference } from "../theme/types.js";
import { useSettings } from "./useSettings.js";

export const useThemeConfig = () => {
  const { themeConfig } = useModalContext();
  const { settings, updateThemePreference } = useSettings();

  const appThemeMode: ThemeMode = themeConfig?.mode ?? "auto";
  const userThemeMode: UserThemePreference = settings?.theme ?? "system";

  const isUserConfigurable = appThemeMode === "auto";

  const themeMode = !isUserConfigurable
    ? appThemeMode
    : (userThemeMode ?? "system");

  return {
    themeMode,
    appThemeMode,
    userThemeMode,
    isUserConfigurable,
    updateThemePreference,
  };
};
