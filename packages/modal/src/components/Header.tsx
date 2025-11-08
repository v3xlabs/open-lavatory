import { LuChevronLeft, LuCircleHelp, LuX } from "react-icons/lu";
import { Button } from "../ui/Button";

export const Header = ({
  title,
  view,
  setView,
  onClose,
  onBack,
}: {
  title: string;
  view: "start" | "uri" | "settings";
  setView: (view: "start" | "settings") => void;
  onClose: () => void;
  onBack?: () => void;
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {onBack ? (
        <Button
          onClick={onBack}
          aria-label={view === "settings" ? "Back to QR" : "Close modal"}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-gray-200"
        >
          <LuChevronLeft className="h-6 w-6 text-gray-500" />
        </Button>
      ) : (
        <button
          type="button"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors hover:bg-neutral-200"
        >
          <LuCircleHelp className="h-5 w-5" />
        </button>
      )}
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
