import { useCallback } from "preact/hooks";
import QRCode from "qrcode-generator";

import type { ConnectionInfo } from "../types/connection";

interface ConnectionFlowProps {
  connectionInfo: ConnectionInfo;
  onStartConnection: () => void;
  onRetry: () => void;
  onClose: () => void;
  onCopy: (uri: string) => void;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

const ConnectionStatus = ({
  connectionInfo,
  onStartConnection,
  onRetry,
  onClose,
  onCopy,
}: ConnectionFlowProps) => {
  const { state, uri, error, connectedAccount } = connectionInfo;

  const handleCopy = useCallback(() => {
    if (uri) {
      onCopy(uri);
    }
  }, [uri, onCopy]);

  const generateQRCode = useCallback((uri: string) => {
    const qr = QRCode(0, "M");

    qr.addData(uri);
    qr.make();

    return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
  }, []);

  switch (state) {
    case "idle":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Connect
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Click the button below to start the connection process and
              generate a QR code for your wallet to scan.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartConnection}
            className="w-full rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Start Connection
          </button>
        </div>
      );

    case "initializing":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <LoadingSpinner />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Initializing Connection
            </h3>
            <p className="text-sm text-gray-500">
              Setting up secure connection...
            </p>
          </div>
        </div>
      );

    case "connecting":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <LoadingSpinner />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connecting
            </h3>
            <p className="text-sm text-gray-500">
              Waiting for wallet to connect...
            </p>
          </div>
        </div>
      );

    case "qr-ready":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Scan QR Code
            </h3>
            <p className="text-sm text-gray-500">
              Use your mobile wallet to scan this QR code
            </p>
          </div>

          {uri && (
            <div className="relative mx-auto flex w-fit items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-4 shadow-lg">
              <div
                className="flex h-[200px] w-[200px] items-center justify-center cursor-pointer"
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
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition"
            >
              Copy Connection URL
            </button>
          </div>
        </div>
      );

    case "connected":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connected Successfully!
            </h3>
            {connectedAccount && (
              <p className="text-sm text-gray-500 mb-4">
                Connected with: {connectedAccount.slice(0, 6)}...
                {connectedAccount.slice(-4)}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Your wallet is now connected and ready to use.
            </p>
          </div>
        </div>
      );

    case "error":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connection Failed
            </h3>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <p className="text-sm text-gray-500 mb-4">
              Something went wrong during the connection process.
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      );

    case "disconnected":
      return (
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnected
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              The connection has been closed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      );

    default:
      return null;
  }
};

export const ConnectionFlow = ConnectionStatus;
