import { useCallback } from "preact/hooks";
import { IoIosSettings } from "react-icons/io";
import { LuChevronLeft, LuX } from "react-icons/lu";
import { match } from "ts-pattern";

import { useProvider } from "../hooks/useProvider";
import { log } from "../utils/log";

export const Header = ({
  title,
  view,
  setView,
  onClose,
}: {
  title: string;
  view: "start" | "uri" | "settings";
  setView: (view: "start" | "settings") => void;
  onClose: () => void;
}) => {
  const { status, provider } = useProvider();
  const closeSession = useCallback(async () => {
    log("closing session");
    await provider?.closeSession();
  }, [provider]);

  const onBack = useCallback(() => {
    log("status", status);

    match(status)
      .with("disconnected", () =>
        match({ view })
          .with({ view: "settings" }, () => setView("start"))
          .with({ view: "start" }, onClose)
          .otherwise(onClose),
      )
      .with("connecting", closeSession)
      .with("connected", onClose)
      .otherwise(onClose);
  }, [status, view, setView, onClose, closeSession]);

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={view === "settings" ? "Back to QR" : "Close modal"}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-gray-200"
      >
        <LuChevronLeft className="h-6 w-6 text-gray-500" />
      </button>
      <h2 className="flex items-center justify-center gap-2 font-semibold text-gray-900 text-lg">
        {title}
      </h2>
      <button
        type="button"
        aria-label={"close"}
        aria-pressed={false}
        onClick={onClose}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-gray-200"
      >
        <LuX className="h-6 w-6 text-gray-500" />
      </button>
    </div>
  );
};
