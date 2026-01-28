import { useSettings } from "../../hooks/useSettings.js";
import { useTranslation } from "../../utils/i18n.js";
import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { Input } from "../../ui/Input.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";

type SignalingProtocol = "MQTT" | "NTFY" | "GUN";

const protocolOptions: SignalingProtocol[] = ["MQTT", "NTFY", "GUN"];

export const SignalingSettings = () => {
  const { t } = useTranslation();
  const { settings, updateSignalingProtocol, updateSignalingServer } =
    useSettings();

  return (
    <div>
      <MenuGroup
        title={t("settings.signaling.title")}
        right={
          <InfoTooltip variant="icon">
            {t("settings.signaling.description")}
          </InfoTooltip>
        }
      >
        <MenuItem label={t("common.protocol")}>
          <Select
            options={protocolOptions.map((option) => [
              option.toLowerCase(),
              option,
            ])}
            value={settings?.signaling.p || ""}
            onChange={updateSignalingProtocol}
          />
        </MenuItem>
        <MenuItem label={t("settings.signaling.server")}>
          <Input
            id="server"
            value={settings?.signaling.s[settings?.signaling.p || ""] || ""}
            onChange={(value) => updateSignalingServer(value)}
            placeholder={t("settings.signaling.serverUrl")}
            ariaLabel={t("settings.signaling.serverUrl")}
            readOnly={false}
          />
        </MenuItem>
      </MenuGroup>
    </div>
  );
};
