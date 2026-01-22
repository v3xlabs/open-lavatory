import { useSettings } from "../../hooks/useSettings.js";
import { MenuGroup } from "../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../ui/menu/MenuItem.js";
import { Toggle } from "../../ui/Toggle.js";

export const ConnectionPreferences = () => {
  const { settings, updateRetainHistory, updateAutoReconnect } = useSettings();

  return (
    <MenuGroup title="Connection preferences">
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
