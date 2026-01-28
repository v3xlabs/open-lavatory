import { useSettings } from "../../hooks/useSettings.js";
import { useTranslation } from "../../utils/i18n.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Toggle } from "../../ui/Toggle.js";

export const ConnectionPreferences = () => {
  const { t } = useTranslation();
  const { settings, updateRetainHistory, updateAutoReconnect } = useSettings();

  return (
    <MenuGroup title={t("settings.connectionPreferences.title")}>
      {(
        [
          [
            t("settings.connectionPreferences.retainSessionHistory"),
            "retainHistory",
            settings?.retainHistory ?? false,
            updateRetainHistory,
          ],
          [
            t("settings.connectionPreferences.autoReconnect"),
            "autoReconnect",
            settings?.autoReconnect ?? false,
            updateAutoReconnect,
          ],
        ] as const
      ).map(([label, key, value, onChange]) => (
        <MenuItem label={label} key={key}>
          <Toggle label={label} value={value} onChange={onChange} />
        </MenuItem>
      ))}
    </MenuGroup>
  );
};
