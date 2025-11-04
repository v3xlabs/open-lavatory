import { InfoTooltip } from "../ui/InfoTooltip";
import { Toggle } from "../ui/Toggle";

const PREFERENCES_TEMPLATE = {
  retainHistory: false,
  autoReconnect: false,
} as const;

export const ConnectionPreferences = () => {
  const preferences = PREFERENCES_TEMPLATE;

  const renderToggle = (label: string, value: boolean) => (
    <div className="flex items-center justify-between">
      <div className="font-semibold text-gray-900 text-sm">{label}</div>
      <Toggle label={label} value={value} onChange={(value) => { }} />
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Connection preferences</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
        {renderToggle("Retain session history", preferences.retainHistory)}
        {renderToggle("Auto reconnect", preferences.autoReconnect)}
      </div>
    </div>
  );
};
