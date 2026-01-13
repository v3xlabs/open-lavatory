import { useState } from "preact/hooks";

import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";

const transportOptions = ["WebRTC"];

export const TransportSettings = () => {
  const [selectedTransport, setSelectedTransport] = useState("WebRTC");

  return (
    <MenuGroup
      title="Transport"
      right={
        <InfoTooltip variant="icon">
          This is how the connection is maintained.
        </InfoTooltip>
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
