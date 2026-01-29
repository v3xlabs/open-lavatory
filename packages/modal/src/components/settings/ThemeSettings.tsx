import type { UserThemePreference } from "@openlv/provider/storage";
import type { FC } from "preact/compat";

import { useThemeConfig } from "../../hooks/useThemeConfig.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";
import { useTranslation } from "../../utils/i18n.js";

export const ThemeSettings: FC = () => {
  const { t } = useTranslation();
  const { userTheme, isUserConfigurable, updateThemePreference } =
    useThemeConfig();

  if (!isUserConfigurable) {
    return null;
  }

  const themeOptions: Array<[UserThemePreference, string]> = [
    ["system", t("settings.theme.system") as string],
    ["light", t("settings.theme.light") as string],
    ["dark", t("settings.theme.dark") as string],
  ];

  return (
    <MenuGroup title={t("settings.theme.title") as string}>
      <MenuItem label={t("settings.theme.mode") as string}>
        <Select
          options={themeOptions}
          value={userTheme}
          onChange={(value) =>
            updateThemePreference(value as UserThemePreference)
          }
        />
      </MenuItem>
    </MenuGroup>
  );
};
