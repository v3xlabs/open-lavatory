import { LucideQrCode } from "lucide-solid";

import { useTranslation } from "../utils/i18n.js";

export const InfoScreen = () => {
  const { t } = useTranslation();

  return (
    <div class="flex flex-col space-y-2 px-4 text-start">
      <div class="min-h-32 w-full rounded-md border border-(--lv-control-button-secondary-border) md:flex justify-start divide-y md:divide-y-0 md:divide-x divide-(--lv-control-button-secondary-border)">
        <div class="p-2 w-full md:w-3/5">
          {t("info.scanQrCode")}
        </div>
        <div class="flex justify-center items-center grow">
          <LucideQrCode class="w-10 h-10" />
        </div>
      </div>
      <div class="w-full rounded-md border border-(--lv-control-button-secondary-border) md:flex justify-start divide-y md:divide-y-0 md:divide-x divide-(--lv-control-button-secondary-border)">
        <div class="p-2 w-full md:w-3/5">
          {t("info.approveOnDevice")}
        </div>
        <div class="">

        </div>
      </div>
      <div class="w-full rounded-md border border-(--lv-control-button-secondary-border) md:flex justify-start divide-y md:divide-y-0 md:divide-x divide-(--lv-control-button-secondary-border)">
        <div class="p-2 w-full md:w-3/5">
          {t("info.youreConnected")}
        </div>
        <div class="">

        </div>
      </div>
    </div>
  );
};
