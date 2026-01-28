import type { FC } from "preact/compat";
import { IoIosSettings } from "react-icons/io";

import { useSessionStart } from "../../hooks/useSession.js";
import { useTranslation } from "../../utils/i18n.js";
import { Button } from "../../ui/Button.js";
import { ConnectionGraphic } from "./ConnectionGraphic.js";

export const Disconnected: FC<{ onSettings: () => void }> = ({
  onSettings,
}) => {
  const { t } = useTranslation();
  const { start } = useSessionStart();

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <ConnectionGraphic />
      <div className="text-center">
        <p className="text-sm text-(--lv-text-secondary)">
          {t("disconnected.prompt")}
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
          {t("disconnected.generateQr")}
        </Button>
        <Button
          type="button"
          aria-label={t("disconnected.connectionSettings")}
          aria-pressed={false}
          onClick={onSettings}
          className="-ml-1 rounded-l-none px-3"
          $aspect="square"
          $size="lg"
          $variant="secondary"
        >
          <IoIosSettings className="h-5 w-5 text-(--lv-text-muted)" />
        </Button>
      </div>
    </div>
  );
};
