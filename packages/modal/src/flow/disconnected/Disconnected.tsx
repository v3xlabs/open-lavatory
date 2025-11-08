import type { FC } from "preact/compat";
import { IoIosSettings } from "react-icons/io";

import { useSessionStart } from "../../hooks/useSession";
import { Button } from "../../ui/Button";

export const Disconnected: FC<{ onSettings: () => void }> = ({
  onSettings,
}) => {
  const { start } = useSessionStart();

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="-space-x-4 flex items-end">
        <div className="h-48 w-48 rounded-lg bg-gray-300"></div>
        <div className="h-18 w-12 rounded-lg bg-gray-200"></div>
      </div>
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          Click the button below to start a connection
        </p>
      </div>
      <div className="flex items-center">
        <Button
          type="button"
          onClick={start}
          className="z-10 px-6 py-3"
          $variant="primary"
          $size="lg"
        >
          Generate QR
        </Button>
        <Button
          type="button"
          aria-label="Connection settings"
          aria-pressed={false}
          onClick={onSettings}
          // className="-ml-1 flex aspect-square h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-r-lg py-3 pr-3 pl-4 transition-colors hover:bg-gray-200"
          className="-ml-1 rounded-l-none px-3"
          $aspect="square"
          $size="lg"
          $variant="secondary"
        >
          <IoIosSettings className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </div>
  );
};
