import { useModalContext } from "../context.js";
import type {
  ThemeConfig,
  ThemeMode,
  UserThemePreference,
} from "../theme/types.js";
import { useSettings } from "./useSettings.js";

export const useThemeConfig = () => {
  const { provider } = useModalContext();
  const { settings, updateThemePreference } = useSettings();

  const themeConfig = provider?.themeConfig as ThemeConfig | undefined;
  const appThemeMode: ThemeMode = themeConfig?.mode ?? "auto";
  const userTheme: UserThemePreference = settings?.theme ?? "system";

  const isUserConfigurable = appThemeMode === "auto";

  return {
    appThemeMode,
    userTheme,
    isUserConfigurable,
    updateThemePreference,
  };
};
