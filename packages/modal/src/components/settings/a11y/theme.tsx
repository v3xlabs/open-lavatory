import type { UserThemePreference } from "@openlv/provider/storage";
import type { FC } from "preact/compat";

import { useThemeConfig } from "../../../hooks/useThemeConfig.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { Select } from "../../../ui/Select.js";
import { useTranslation } from "../../../utils/i18n.js";

export const ThemeSettings: FC = () => {
  const { t } = useTranslation();
  const { userThemeMode, isUserConfigurable, updateThemePreference }
    = useThemeConfig();

  if (!isUserConfigurable) {
    // eslint-disable-next-line unicorn/no-null -- React requires null for empty renders
    return null;
  }

  const themeOptions: Array<[UserThemePreference, string]> = [
    ["light", t("settings.theme.light") as string],
    ["dark", t("settings.theme.dark") as string],
    ["system", t("settings.theme.system") as string],
  ];

  return (
    <MenuItem label={t("settings.theme.mode") as string}>
      <Select
        options={themeOptions}
        value={userThemeMode}
        onChange={value =>
          updateThemePreference(value as UserThemePreference)}
      />
    </MenuItem>
  );
};
