import { useState } from "preact/hooks";

import { useTranslation } from "../../utils/i18n.js";
import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";

const transportOptions = ["WebRTC"];

export const TransportSettings = () => {
  const { t } = useTranslation();
  const [selectedTransport, setSelectedTransport] = useState("WebRTC");

  return (
    <MenuGroup
      title={t("settings.transport.title")}
      right={
        <InfoTooltip variant="icon">
          {t("settings.transport.description")}
        </InfoTooltip>
      }
    >
      <MenuItem label={t("common.protocol")}>
        <Select
          options={transportOptions.map((option) => [option, option])}
          value={selectedTransport}
          onChange={(value) =>
            setSelectedTransport(value as (typeof transportOptions)[number])
          }
        />
      </MenuItem>
    </MenuGroup>
  );
};
