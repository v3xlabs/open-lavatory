import classNames from "classnames";

import { InfoTooltip } from "../ui/InfoTooltip";

const PREFERENCES_TEMPLATE = {
  retainHistory: false,
  autoReconnect: false,
} as const;

export const ConnectionPreferences = () => {
  const preferences = PREFERENCES_TEMPLATE;

  const renderToggle = (label: string, description: string, value: boolean) => (
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900 text-sm">{label}</div>
        <p className="mt-1 text-gray-500 text-xs">{description}</p>
      </div>
      <div className="flex items-center rounded-full bg-gray-200 p-0.5">
        <button
          type="button"
          disabled
          className={classNames(
            "rounded-full px-3 py-1 font-semibold text-xs transition",
            !value ? "bg-emerald-400 text-white shadow" : "text-gray-600",
          )}
        >
          NO
        </button>
        <button
          type="button"
          disabled
          className={classNames(
            "rounded-full px-3 py-1 font-semibold text-xs transition",
            value ? "bg-emerald-400 text-white shadow" : "text-gray-600",
          )}
        >
          YES
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>Connection preferences</div>
        <InfoTooltip variant="icon">Something something very cool</InfoTooltip>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-[#F4F5F6] p-2">
        {renderToggle(
          "Retain session history",
          "Keep recent connection details saved on this device.",
          preferences.retainHistory,
        )}
        {renderToggle(
          "Auto reconnect",
          "Requires retained session history to reconnect automatically.",
          preferences.autoReconnect,
        )}
      </div>
    </div>
  );
};
