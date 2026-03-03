import { Button } from "../ui/Button.js";
import { IconChevronLeft, IconCircleHelp, IconX } from "../ui/icons.js";
import { useTranslation } from "../utils/i18n.js";
import type { ModalView } from "./ModalRoot.js";

export const Header = (props: {
  title: string;
  view: ModalView;
  onClose: () => void;
  onBack?: () => void;
  setView: (view: ModalView) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div class="flex items-center justify-between px-2 py-2">
      {props.onBack
        ? (
            <Button
              onClick={props.onBack}
              aria-label={String(
                props.view === "settings"
                  ? t("modal.backToQr")
                  : t("modal.closeModal"),
              )}
              $variant="tertiary"
              $aspect="square"
              $size="md"
            >
              <IconChevronLeft class="h-6 w-6 text-(--lv-text-muted) rtl:rotate-180" />
            </Button>
          )
        : (
            <Button
              type="button"
              onClick={() => props.setView("info")}
              $variant="tertiary"
              $aspect="square"
              $size="md"
            >
              <IconCircleHelp class="h-5 w-5" />
            </Button>
          )}
      <h2 class="flex items-center justify-center gap-2 font-semibold text-(--lv-text-primary) text-lg">
        {props.title}
      </h2>
      <Button
        type="button"
        aria-label={String(t("common.close"))}
        aria-pressed={false}
        onClick={props.onClose}
        $variant="tertiary"
        $aspect="square"
        $size="md"
      >
        <IconX class="h-6 w-6 text-(--lv-text-muted)" />
      </Button>
    </div>
  );
};
