import type { UserThemePreference } from "@openlv/provider/storage";
import { Show } from "solid-js";

import { useThemeConfig } from "../../../hooks/useThemeConfig.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { Select } from "../../../ui/Select.js";
import { useTranslation } from "../../../utils/i18n.js";

export const ThemeSettings = () => {
  const { t } = useTranslation();
  const { userThemeMode, isUserConfigurable, updateThemePreference } =
    useThemeConfig();

  const themeOptions = (): Array<[UserThemePreference, string]> => [
    ["light", t("settings.theme.light") as string],
    ["dark", t("settings.theme.dark") as string],
    ["system", t("settings.theme.system") as string],
  ];

  return (
    <Show when={isUserConfigurable()}>
      <MenuItem label={t("settings.theme.mode") as string}>
        <Select
          options={themeOptions()}
          value={userThemeMode()}
          onChange={(value) =>
            updateThemePreference(value as UserThemePreference)
          }
        />
      </MenuItem>
    </Show>
  );
};
