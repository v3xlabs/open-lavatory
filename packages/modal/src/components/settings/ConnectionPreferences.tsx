import { useSettings } from "../../hooks/useSettings";
import { InfoTooltip } from "../ui/InfoTooltip";
import { Toggle } from "../ui/Toggle";

export const ConnectionPreferences = () => {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Connection preferences</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
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
          <div className="flex items-center justify-between" key={key}>
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            <Toggle label={label} value={value} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  );
};
