import type { Dispatch, StateUpdater } from "preact/hooks";
import { LuChevronLeft, LuCircleHelp, LuX } from "react-icons/lu";

import { Button } from "../ui/Button.js";
import { useTranslation } from "../utils/i18n.js";
import type { ModalView } from "./ModalRoot.js";

export const Header = ({
  title,
  view,
  onClose,
  onBack,
  setView,
}: {
  title: string;
  view: ModalView;
  onClose: () => void;
  onBack?: () => void;
  setView: Dispatch<StateUpdater<ModalView>>;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-2 py-2">
      {onBack ? (
        <Button
          onClick={onBack}
          aria-label={
            view === "settings" ? t("modal.backToQr") : t("modal.closeModal")
          }
          $variant="tertiary"
          $aspect="square"
          $size="md"
        >
          <LuChevronLeft className="h-6 w-6 text-(--lv-text-muted) rtl:rotate-180" />
        </Button>
      ) : (
        // <Button
        //   type="button"
        //   href="https://openlv.sh"
        //   target="_blank"
        //   $variant="tertiary"
        //   $aspect="square"
        //   $size="md"
        // >
        //   <LuCircleHelp className="h-5 w-5" />
        // </Button>
        <Button
          type="button"
          onClick={() => setView("info")}
          $variant="tertiary"
          $aspect="square"
          $size="md"
        >
          <LuCircleHelp className="h-5 w-5" />
        </Button>
      )}
      <h2 className="flex items-center justify-center gap-2 font-semibold text-(--lv-text-primary) text-lg">
        {title}
      </h2>
      <Button
        type="button"
        aria-label={t("common.close")}
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
