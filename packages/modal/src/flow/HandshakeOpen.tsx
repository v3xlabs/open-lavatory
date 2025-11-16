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
      <div className="w-full space-y-4 rounded-md border border-neutral-200 bg-neutral-100 p-4">
        {uri && (
          <div className="relative mx-auto flex w-fit items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
            <button
              className="h-[200px] w-[200px] cursor-pointer"
              onClick={handleCopy}
              title="Click to copy connection URL"
              dangerouslySetInnerHTML={{ __html: generateQRCode(uri) }}
            />
          </div>
        )}

        <div className="w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 text-gray-700 text-sm transition hover:bg-gray-300"
          >
            Copy Connection URL
          </button>
        </div>
      </div>
      <div className="w-full">
        <span>Scan the link above using your mobile wallet.</span>
        <br />
        <span>Or copy the link and paste it into your wallet.</span>
      </div>
    </div>
  );
};
