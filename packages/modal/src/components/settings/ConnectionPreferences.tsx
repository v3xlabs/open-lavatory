import { useSettings } from "../../hooks/useSettings";
import { InfoTooltip } from "../ui/InfoTooltip";
import { MenuGroup } from "../ui/menu/MenuGroup";
import { MenuItem } from "../ui/menu/MenuItem";
import { Toggle } from "../ui/Toggle";

export const ConnectionPreferences = () => {
  const { settings, updateSettings } = useSettings();

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
            (value: boolean) => updateSettings({ retainHistory: value }),
          ],
          [
            "Auto reconnect",
            "autoReconnect",
            settings?.autoReconnect ?? false,
            (value: boolean) => updateSettings({ autoReconnect: value }),
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
