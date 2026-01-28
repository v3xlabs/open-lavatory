import type { FC } from "preact/compat";
import { useCallback } from "preact/hooks";
import * as QRCode from "qrcode-generator";

import { useSession } from "../hooks/useSession.js";
import { useTranslation } from "../utils/i18n.js";

export const HandshakeOpen: FC<{ onCopy: (uri: string) => void }> = ({
  onCopy,
}) => {
  const { t } = useTranslation();
  const { uri } = useSession();

  const handleCopy = useCallback(() => {
    if (uri) {
      onCopy(uri);
    }
  }, [uri, onCopy]);

  const generateQRCode = useCallback((uri: string) => {
    // qrcode-generator ships a callable export as default, but its types are wrong
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR: any = (QRCode as any).default;

    const qr = QR(0, "M");

    qr.addData(uri);
    qr.make();

    return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 px-2">
      <div className="w-full space-y-4 rounded-md border border-(--lv-control-button-secondary-border) bg-(--lv-card-background) p-4">
        {uri && (
          <div className="relative mx-auto flex w-fit items-center justify-center rounded-lg border border-(--lv-control-button-secondary-border) bg-(--lv-qr-background) p-4">
            <button
              className="h-[200px] w-[200px] cursor-pointer rounded bg-(--lv-qr-background) text-(--lv-qr-color)"
              onClick={handleCopy}
              title={t("handshake.clickToCopyUrl")}
              dangerouslySetInnerHTML={{ __html: generateQRCode(uri) }}
            />
          </div>
        )}

        <div className="w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full cursor-pointer rounded-lg border border-(--lv-control-button-secondary-border) bg-(--lv-control-button-secondary-background) px-4 py-2 text-sm text-(--lv-text-primary) transition hover:bg-(--lv-control-button-secondary-hoverBackground) active:bg-(--lv-control-button-secondary-activeBackground)"
          >
            {t("handshake.copyConnectionUrl")}
          </button>
        </div>
      </div>
      <div className="w-full text-sm text-(--lv-text-secondary)">
        <span>{t("handshake.scanCodeInstruction")}</span>
        <br />
        <span>{t("handshake.orCopyLink")}</span>
      </div>
    </div>
  );
};
