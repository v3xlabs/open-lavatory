import { useState } from "preact/hooks";

import { InfoTooltip } from "../../ui/InfoTooltip";
import { MenuGroup } from "../../ui/menu/MenuGroup";
import { MenuItem } from "../../ui/menu/MenuItem";
import { Select } from "../../ui/Select";

const transportOptions = ["WebRTC"];

export const TransportSettings = () => {
  const [selectedTransport, setSelectedTransport] = useState("WebRTC");

  return (
    <MenuGroup
      title="Transport"
      right={
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      }
    >
      <MenuItem label="Protocol">
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
