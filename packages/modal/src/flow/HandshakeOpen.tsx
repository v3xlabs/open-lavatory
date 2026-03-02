import * as QRCode from "qrcode-generator";
import { Show } from "solid-js";

import { useSession } from "../hooks/useSession.js";
import { useTranslation } from "../utils/i18n.js";

export const HandshakeOpen = (props: { onCopy: (uri: string) => void }) => {
  const { t } = useTranslation();
  const { uri } = useSession();

  const handleCopy = () => {
    const sessionUri = uri();

    if (sessionUri) {
      props.onCopy(sessionUri);
    }
  };

  const generateQRCode = (uriValue: string) => {
    // qrcode-generator ships a callable export as default, but its types are wrong
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR: any = (QRCode as any).default;

    const qr = QR(0, "M");

    qr.addData(uriValue);
    qr.make();

    return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
  };

  return (
    <div class="flex flex-col items-center gap-4 px-2">
      <div class="w-full space-y-4 rounded-md border border-(--lv-control-button-secondary-border) bg-(--lv-card-background) p-4">
        <Show when={uri()}>
          {(sessionUri) => (
            <div class="relative mx-auto flex w-fit items-center justify-center rounded-lg border border-(--lv-control-button-secondary-border) bg-(--lv-qr-background) p-4">
              <button
                type="button"
                class="h-[200px] w-[200px] cursor-pointer rounded bg-(--lv-qr-background) text-(--lv-qr-color)"
                onClick={handleCopy}
                title={String(t("handshake.clickToCopyUrl"))}
                innerHTML={generateQRCode(sessionUri())}
              />
            </div>
          )}
        </Show>

        <div class="w-full">
          <button
            type="button"
            onClick={handleCopy}
            class="w-full cursor-pointer rounded-lg border border-(--lv-control-button-secondary-border) bg-(--lv-control-button-secondary-background) px-4 py-2 text-sm text-(--lv-text-primary) transition hover:bg-(--lv-control-button-secondary-hoverBackground) active:bg-(--lv-control-button-secondary-activeBackground)"
          >
            {t("handshake.copyConnectionUrl")}
          </button>
        </div>
      </div>
      <div class="w-full text-sm text-(--lv-text-secondary)">
        <span>{t("handshake.scanCodeInstruction")}</span>
      </div>
    </div>
  );
};
