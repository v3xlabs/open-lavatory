import type { UserThemePreference } from "@openlv/provider/storage";
import type { FC } from "preact/compat";

import { useThemeConfig } from "../../hooks/useThemeConfig.js";
import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";

const themeOptions: Array<[UserThemePreference, string]> = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

export const ThemeSettings: FC = () => {
  const { userTheme, isUserConfigurable, updateThemePreference } =
    useThemeConfig();

  if (!isUserConfigurable) {
    return null;
  }

  return (
    <div>
      <MenuGroup
        title="Appearance"
        right={
          <InfoTooltip variant="icon">
            Choose your preferred color theme for the modal.
          </InfoTooltip>
        }
      >
        <MenuItem label="Theme">
          <Select
            options={themeOptions}
            value={userTheme}
            onChange={(value) =>
              updateThemePreference(value as UserThemePreference)
            }
          />
        </MenuItem>
      </MenuGroup>
    </div>
  );
};
