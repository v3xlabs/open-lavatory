import { useTranslation } from "../utils/i18n.js";

export const InfoScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-2 px-4">
      <div className="min-h-32 w-full rounded-md border border-(--lv-control-button-secondary-border) p-2">
        {t("info.scanQrCode")}
      </div>
      <div className="w-full rounded-md border border-border p-2">
        {t("info.approveOnDevice")}
      </div>
      <div className="w-full rounded-md border border-border p-2">
        {t("info.youreConnected")}
      </div>
    </div>
  );
};
