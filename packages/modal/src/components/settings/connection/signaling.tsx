import { useSettings } from "../../../hooks/useSettings.js";
import { Input } from "../../../ui/Input.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { Select } from "../../../ui/Select.js";
import { useTranslation } from "../../../utils/i18n.js";

const AVAILABLE_PROTOCOLS = ["mqtt", "ntfy", "gun"];

export const SignalingSettings = () => {
  const { t } = useTranslation();
  const { settings, updateSignalingProtocol, updateSignalingServer }
    = useSettings();

  return (
    <div>
      <MenuGroup title={t("settings.signaling.title")}>
        <MenuItem label={t("common.protocol")}>
          <Select
            options={AVAILABLE_PROTOCOLS.map(option => [
              option.toLowerCase(),
              option.toUpperCase(),
            ])}
            value={settings?.signaling?.p || ""}
            onChange={updateSignalingProtocol}
          />
        </MenuItem>
        <MenuItem label={t("settings.signaling.server")}>
          <Input
            id="server"
            value={settings?.signaling?.s?.[settings?.signaling?.p ?? ""] ?? ""}
            onChange={value => updateSignalingServer(value)}
            placeholder={t("settings.signaling.serverUrl")}
            ariaLabel={t("settings.signaling.serverUrl")}
            readOnly={false}
          />
        </MenuItem>
      </MenuGroup>
      <div className="p-2 text-sm text-(--lv-text-secondary) text-start">
        {t("settings.signaling.description")}
      </div>
    </div>
  );
};
