import { ChevronLeftIcon, CogIcon } from "../icons";

export const Header = ({
  title,
  view,
  onBack,
  onToggleSettings,
}: {
  title: string;
  view: "qr" | "settings";
  onBack: () => void;
  onToggleSettings: () => void;
}) => (
  <div className="flex items-center justify-between mb-2">
    <button
      type="button"
      onClick={onBack}
      aria-label={view === "settings" ? "Back to QR" : "Close modal"}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-gray-200"
    >
      <ChevronLeftIcon />
    </button>
    <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900">
      {title}
    </h2>
    <button
      type="button"
      aria-label={
        view === "settings"
          ? "Hide connection settings"
          : "Show connection settings"
      }
      aria-pressed={view === "settings"}
      onClick={onToggleSettings}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-gray-200"
    >
      <CogIcon />
    </button>
  </div>
);
