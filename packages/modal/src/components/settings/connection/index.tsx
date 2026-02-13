import { useSettings } from "../../../hooks/useSettings.js";
import { InfoTooltip } from "../../../ui/InfoTooltip.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { MenuLink } from "../../../ui/menu/MenuLink.js";
import { Toggle } from "../../../ui/Toggle.js";
import { useTranslation } from "../../../utils/i18n.js";
import type { SettingsScreen } from "../index.js";

export const ConnectionPreferences = ({
  onNavigate,
}: {
  onNavigate: (screen: SettingsScreen) => void;
}) => {
  const { t } = useTranslation();
  const { settings, updateRetainLastUsed, updateAutoReconnect } = useSettings();

  return (
    <MenuGroup title={t("settings.connectionPreferences.title")}>
      <MenuLink
        label={
          <>
            {t("settings.signaling.title")}
            <InfoTooltip variant="icon">
              {t("settings.signaling.description")}
            </InfoTooltip>
          </>
        }
        onClick={() => onNavigate("signaling")}
        value={settings?.signaling?.p}
      />
      <MenuLink
        label={
          <>
            {t("settings.transport.title")}
            <InfoTooltip variant="icon">
              {t("settings.transport.description")}
            </InfoTooltip>
          </>
        }
        onClick={() => onNavigate("transport")}
        value={"WebRTC"}
      />
      {(
        [
          [
            t("settings.connectionPreferences.retainSessionHistory"),
            "retainLastUsed",
            settings?.retainLastUsed ?? false,
            updateRetainLastUsed,
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
