import type { FC } from "preact/compat";
import { IoIosSettings } from "react-icons/io";

import { useSessionStart } from "../../hooks/useSession";

export const Disconnected: FC<{ onSettings: () => void }> = ({
  onSettings,
}) => {
  const { start } = useSessionStart();

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="text-center">
        <h3 className="mb-2 font-semibold text-gray-900 text-lg">
          Ready to Connect
        </h3>
        <p className="mb-4 text-gray-500 text-sm">
          Click the button below to start a connection
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={start}
          className="w-full cursor-pointer rounded-lg bg-blue-500 px-6 py-3 font-semibold text-sm text-white transition hover:bg-blue-600"
        >
          Start Connection
        </button>
        <button
          type="button"
          aria-label={"close"}
          aria-pressed={false}
          onClick={onSettings}
          className="flex aspect-square w-fit cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-gray-200"
        >
          {/* <span className="text-xs">Connection Settings</span> */}
          <IoIosSettings className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
};
