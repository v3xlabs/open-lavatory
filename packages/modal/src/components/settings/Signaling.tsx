import { useSettings } from "../../hooks/useSettings.js";
import { InfoTooltip } from "../../ui/InfoTooltip.js";
import { Input } from "../../ui/Input.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Select } from "../../ui/Select.js";

type SignalingProtocol = "MQTT" | "NTFY" | "GUN";

const protocolOptions: SignalingProtocol[] = ["MQTT", "NTFY", "GUN"];

export const SignalingSettings = () => {
  const { settings, updateSignalingProtocol, updateSignalingServer } =
    useSettings();

  return (
    <div>
      <MenuGroup
        title="Signaling"
        right={
          <InfoTooltip variant="icon">
            Something something very cool
          </InfoTooltip>
        }
      >
        <MenuItem label="Protocol">
          <Select
            options={protocolOptions.map((option) => [
              option.toLowerCase(),
              option,
            ])}
            value={settings?.signaling.p || ""}
            onChange={updateSignalingProtocol}
          />
        </MenuItem>
        <MenuItem label="Server">
          <Input
            id="server"
            value={settings?.signaling.s[settings?.signaling.p || ""] || ""}
            onChange={(value) => updateSignalingServer(value)}
            placeholder="Server URL"
            ariaLabel="Server URL"
            readOnly={false}
          />
        </MenuItem>
      </MenuGroup>
    </div>
  );
};
