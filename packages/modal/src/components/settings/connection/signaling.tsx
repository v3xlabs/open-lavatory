import { useSettings } from "../../../hooks/useSettings.js";
import { Input } from "../../../ui/Input.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { Select } from "../../../ui/Select.js";
import { ServerHistoryBadges } from "../../../ui/ServerHistoryBadges.js";
import { useTranslation } from "../../../utils/i18n.js";

const AVAILABLE_PROTOCOLS = ["mqtt", "ntfy", "gun"];

export const SignalingSettings = () => {
  const { t } = useTranslation();
  const {
    settings,
    updateSignalingProtocol,
    updateSignalingServer,
    removeServerFromHistory,
  } = useSettings();

  return (
    <div>
      <MenuGroup title={t("settings.signaling.title")}>
        <MenuItem label={t("common.protocol")}>
          <Select
            options={AVAILABLE_PROTOCOLS.map((option) => [
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
            onChange={(value) => updateSignalingServer(value)}
            placeholder={t("settings.signaling.serverUrl")}
            ariaLabel={t("settings.signaling.serverUrl")}
            readOnly={false}
          />
        </MenuItem>
        <div className="px-2 pb-2">
          <ServerHistoryBadges
            history={
              settings?.signaling.lastUsed?.[settings?.signaling?.p ?? ""] || []
            }
            currentServer={
              settings?.signaling?.s?.[settings?.signaling?.p ?? ""] ?? ""
            }
            onSelect={(url) => updateSignalingServer(url)}
            onDelete={(url) => removeServerFromHistory(url)}
          />
        </div>
      </MenuGroup>
      <div className="p-2 text-sm text-(--lv-text-secondary) text-start">
        {t("settings.signaling.description")}
      </div>
    </div>
  );
};
