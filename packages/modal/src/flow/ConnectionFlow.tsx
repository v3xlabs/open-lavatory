import type { ProviderStatus } from "@openlv/provider";
import type { SessionStateObject } from "@openlv/session";
import { useEffect, useRef, useState } from "preact/hooks";
import { match, P } from "ts-pattern";

import { UnknownState } from "../components/UnknownState";
import { useProvider } from "../hooks/useProvider";
import { useSession } from "../hooks/useSession";
import { HandshakeOpen } from "./HandshakeOpen";

const supportsViewTransitions = () =>
  typeof document !== "undefined" && "startViewTransition" in document;

const startViewTransition = (callback: () => void) => {
  if (supportsViewTransitions()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition(callback);
  } else {
    callback();
  }
};

interface ConnectionFlowProps {
  onClose: () => void;
  onCopy: (uri: string) => void;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
  </div>
);

const STATE_CONNECTING = "connecting" as const;
const STATE_HANDSHAKE_OPEN = "handshake-open" as const;
const STATE_HANDSHAKE_CLOSED = "handshake-closed" as const;
const STATE_XR_ENCRYPTED = "xr-encrypted" as const;
const STATE_DISCONNECTED = "disconnected" as const;
const STATE_UNKNOWN = "unknown" as const;

type FlowState =
  | typeof STATE_CONNECTING
  | typeof STATE_HANDSHAKE_OPEN
  | typeof STATE_HANDSHAKE_CLOSED
  | typeof STATE_XR_ENCRYPTED
  | typeof STATE_DISCONNECTED
  | typeof STATE_UNKNOWN;

const getFlowState = (
  sessionStatus: SessionStateObject | undefined,
  providerStatus: ProviderStatus,
): FlowState => {
  if (!sessionStatus) {
    return match(providerStatus)
      .with(P.union("creating", "connecting"), () => STATE_CONNECTING)
      .with("connected", () => STATE_XR_ENCRYPTED)
      .with("disconnected", () => STATE_DISCONNECTED)
      .otherwise(() => STATE_UNKNOWN);
  }

  return match(sessionStatus)
    .with({ status: STATE_DISCONNECTED }, () => STATE_DISCONNECTED)
    .with({ status: P.union("connected", "ready") }, () => STATE_XR_ENCRYPTED)
    .with(
      {
        status: "signaling",
        signaling: { state: P.union("handshake-open", "handshaking") },
      },
      () => STATE_HANDSHAKE_OPEN,
    )
    .with(
      {
        status: "signaling",
        signaling: { state: P.union("handshake-closed", "xr-encrypted") },
      },
      () => STATE_HANDSHAKE_CLOSED,
    )
    .with(
      {
        status: "signaling",
        signaling: { state: P.union("connecting", "disconnected") },
      },
      () => STATE_CONNECTING,
    )
    .with({ status: "signaling" }, () => STATE_CONNECTING)
    .with({ status: "created" }, () => STATE_CONNECTING)
    .otherwise(() => STATE_UNKNOWN);
};

const useFlowTransition = (currentState: FlowState) => {
  const [displayState, setDisplayState] = useState(currentState);
  const previousStateRef = useRef<FlowState>(currentState);

  useEffect(() => {
    if (currentState === previousStateRef.current) return;

    startViewTransition(() => {
      setDisplayState(currentState);
      previousStateRef.current = currentState;
    });
  }, [currentState]);

  return {
    displayState,
  };
};

export const ConnectionFlow = ({ onClose, onCopy }: ConnectionFlowProps) => {
  const { status } = useSession();
  const sessionStatus =
    status && typeof status === "object"
      ? (status as SessionStateObject)
      : undefined;
  const { status: providerStatus } = useProvider();
  const currentState = getFlowState(sessionStatus, providerStatus);
  const { displayState } = useFlowTransition(currentState);

  return (
    <div style={{ viewTransitionName: "connection-flow" }} className="w-full">
      {match(displayState)
        .with(STATE_CONNECTING, () => (
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
        .with(STATE_HANDSHAKE_OPEN, () => <HandshakeOpen onCopy={onCopy} />)
        .with(STATE_HANDSHAKE_CLOSED, () => (
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="text-center">
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Establishing e2e encryption...
              </h3>
            </div>
          </div>
        ))
        .with(STATE_XR_ENCRYPTED, () => (
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
        .with(STATE_DISCONNECTED, () => (
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
        .otherwise(() => (
          <UnknownState
            state={{ flow: currentState, session: sessionStatus }}
          />
        ))}
    </div>
  );
};
