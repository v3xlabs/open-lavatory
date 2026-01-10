import type { FC } from "preact/compat";
import { useCallback } from "preact/hooks";
import * as QRCode from "qrcode-generator";

import { useSession } from "../hooks/useSession.js";

export const HandshakeOpen: FC<{ onCopy: (uri: string) => void }> = ({
  onCopy,
}) => {
  const { uri } = useSession();

  const handleCopy = useCallback(() => {
    if (uri) {
      onCopy(uri);
    }
  }, [uri, onCopy]);

  const generateQRCode = useCallback((uri: string) => {
    // qrcode-generator ships a callable export; depending on bundler interop
    // it may be exposed as the module default. Normalize here to be safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR: any = (QRCode as any).default ?? QRCode;

    const qr = QR(0, "M");

    qr.addData(uri);
    qr.make();

    return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
  }, []);

  const secondaryBg = "var(--lv-button-secondary-background)";
  const secondaryBorder = "var(--lv-button-secondary-border)";
  const qrBg = "var(--lv-qr-background)";
  const qrColor = "var(--lv-qr-color)";

  return (
    <div className="flex flex-col items-center gap-4 px-2">
      <div
        className="w-full space-y-4 rounded-md p-4"
        style={{
          background: "var(--lv-body-background)",
          border: `1px solid ${secondaryBorder}`,
        }}
      >
        {uri && (
          <div
            className="relative mx-auto flex w-fit items-center justify-center rounded-lg p-4"
            style={{
              background: qrBg,
              border: `2px solid ${secondaryBorder}`,
            }}
          >
            <button
              className="h-[200px] w-[200px] cursor-pointer rounded"
              onClick={handleCopy}
              title="Click to copy connection URL"
              dangerouslySetInnerHTML={{ __html: generateQRCode(uri) }}
              style={{
                background: qrBg,
                color: qrColor,
              }}
            />
          </div>
        )}

        <div className="w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full cursor-pointer rounded-lg px-4 py-2 text-sm transition"
            style={{
              background: secondaryBg,
              color: "var(--lv-text-primary)",
              border: `1px solid ${secondaryBorder}`,
            }}
          >
            Copy Connection URL
          </button>
        </div>
      </div>
      <div
        className="w-full text-sm"
        style={{ color: "var(--lv-text-secondary)" }}
      >
        <span>Scan the code above using your mobile wallet.</span>
        <br />
        <span>Or copy the link and paste it into your wallet.</span>
      </div>
    </div>
  );
};
