import { useSettings } from "../../hooks/useSettings";
import { InfoTooltip } from "../../ui/InfoTooltip";
import { MenuGroup } from "../../ui/menu/MenuGroup";
import { MenuItem } from "../../ui/menu/MenuItem";
import { Toggle } from "../../ui/Toggle";

export const ConnectionPreferences = () => {
  const { settings, updateRetainHistory, updateAutoReconnect } = useSettings();

  return (
    <MenuGroup
      title="Connection preferences"
      right={
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      }
    >
      {(
        [
          [
            "Retain session history",
            "retainHistory",
            settings?.retainHistory ?? false,
            updateRetainHistory,
          ],
          [
            "Auto reconnect",
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
