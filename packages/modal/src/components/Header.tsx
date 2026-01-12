import { LuChevronLeft, LuCircleHelp, LuX } from "react-icons/lu";

import { Button } from "../ui/Button.js";

export const Header = ({
  title,
  view,
  onClose,
  onBack,
}: {
  title: string;
  view: "start" | "uri" | "settings";
  onClose: () => void;
  onBack?: () => void;
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-2">
      {onBack ? (
        <Button
          onClick={onBack}
          aria-label={view === "settings" ? "Back to QR" : "Close modal"}
          $variant="tertiary"
          $aspect="square"
          $size="md"
        >
          <LuChevronLeft className="h-6 w-6 text-(--lv-text-muted)" />
        </Button>
      ) : (
        <Button
          type="button"
          href="https://openlv.sh"
          target="_blank"
          $variant="tertiary"
          $aspect="square"
          $size="md"
        >
          <LuCircleHelp className="h-5 w-5" />
        </Button>
      )}
      <h2 className="flex items-center justify-center gap-2 font-semibold text-lg text-(--lv-text-primary)">
        {title}
      </h2>
      <Button
        type="button"
        aria-label={"close"}
        aria-pressed={false}
        onClick={onClose}
        $variant="tertiary"
        $aspect="square"
        $size="md"
      >
        <LuX className="h-6 w-6 text-(--lv-text-muted)" />
      </Button>
    </div>
  );
};
