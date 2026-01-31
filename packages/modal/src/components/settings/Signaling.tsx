import { getHistoryForProtocol } from "@openlv/provider/storage";

import { useSettings } from "../../hooks/useSettings.js";
import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { Input } from "../../ui/Input.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";
import { ServerHistoryBadges } from "../../ui/ServerHistoryBadges.js";
import { useTranslation } from "../../utils/i18n.js";

type SignalingProtocol = "MQTT" | "NTFY" | "GUN";

const protocolOptions: SignalingProtocol[] = ["MQTT", "NTFY", "GUN"];

export const SignalingSettings = () => {
  const { t } = useTranslation();
  const {
    settings,
    updateSignalingProtocol,
    updateSignalingServer,
    removeServerFromHistory,
  } = useSettings();

  const currentProtocol = settings?.signaling.p || "";
  const history = getHistoryForProtocol(
    settings?.signaling.lastUsed,
    currentProtocol,
  );
  const currentServer = settings?.signaling.s[currentProtocol] || "";

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
            value={currentProtocol}
            onChange={updateSignalingProtocol}
          />
        </MenuItem>
        <MenuItem label={t("settings.signaling.server")}>
          <Input
            id="server"
            value={currentServer}
            onChange={(value) => updateSignalingServer(value)}
            placeholder={t("settings.signaling.serverUrl")}
            ariaLabel={t("settings.signaling.serverUrl")}
            readOnly={false}
          />
        </MenuItem>
        <ServerHistoryBadges
          history={history}
          currentServer={currentServer}
          onSelect={updateSignalingServer}
          onDelete={removeServerFromHistory}
        />
      </MenuGroup>
    </div>
  );
};
