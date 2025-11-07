/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { match, P } from "ts-pattern";

import { UnknownState } from "../components/UnknownState";
import { useSession } from "../hooks/useSession";
import { HandshakeOpen } from "./HandshakeOpen";

interface ConnectionFlowProps {
  onClose: () => void;
  onCopy: (uri: string) => void;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

export const ConnectionFlow = ({ onClose, onCopy }: ConnectionFlowProps) => {
  const { status: sessionStatus = { status: "created" } } = useSession();

  return match(sessionStatus)
    .with({ status: "disconnected" }, () => <div>hi</div>)
    .with(
      { status: P.union("created", "signaling", "connected", "ready") },
      (x) =>
        match(x.signaling)
          .with({ state: "connecting" }, () => (
            <div className="flex flex-col items-center gap-4 p-6">
              <LoadingSpinner />
              <div className="text-center">
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  Connecting
                </h3>
                <p className="text-gray-500 text-sm">
                  Waiting for wallet to connect...
                </p>
              </div>
            </div>
          ))
          .with({ state: "handshake-open" }, () => (
            <HandshakeOpen onCopy={onCopy} />
          ))
          .with({ state: "handshake-closed" }, () => (
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="text-center">
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  Establishing e2e encryption...
                </h3>
              </div>
            </div>
          ))
          .with({ state: "xr-encrypted" }, () => (
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="text-center">
                <div className="mb-4 text-4xl">✅</div>
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  Connected Successfully!
                </h3>
                <p className="text-gray-500 text-sm">
                  Your wallet is now connected and ready to use.
                </p>
              </div>
            </div>
          ))
          .with({ state: "disconnected" }, () => (
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="text-center">
                <div className="mb-4 text-4xl">🔌</div>
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  Disconnected
                </h3>
                <p className="mb-4 text-gray-500 text-sm">
                  The connection has been closed.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 text-sm transition hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          ))
          .otherwise(() => <UnknownState state={sessionStatus} />),
    )
    .otherwise(() => <UnknownState state={sessionStatus} />);
};
