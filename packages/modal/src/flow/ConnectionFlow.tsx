import { SESSION_STATE, type SessionStateObject } from "@openlv/session";
import { SIGNAL_STATE } from "@openlv/signaling";
import { useEffect, useRef, useState } from "preact/hooks";
import { match } from "ts-pattern";

import { UnknownState } from "../components/UnknownState.js";
import { useSession } from "../hooks/useSession.js";
import { HandshakeOpen } from "./HandshakeOpen.js";

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

const FLOW = {
  CONNECTING: "connecting",
  CREATING: "creating",
  READY: "ready",
  CONFIRMING: "confirming",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

type FlowState = (typeof FLOW)[keyof typeof FLOW];

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

const reduceState = (state: SessionStateObject | undefined): FlowState =>
  match(state)
    .with({ status: SESSION_STATE.CREATED }, () => FLOW.CONNECTING)
    .with({ status: SESSION_STATE.SIGNALING }, () =>
      match(state?.signaling)
        .with({ state: SIGNAL_STATE.STANDBY }, () => FLOW.CONNECTING)
        .with({ state: SIGNAL_STATE.CONNECTING }, () => FLOW.CONNECTING)
        .with({ state: SIGNAL_STATE.READY }, () => FLOW.READY)
        .with({ state: SIGNAL_STATE.HANDSHAKE }, () => FLOW.CONFIRMING)
        .with({ state: SIGNAL_STATE.HANDSHAKE_PARTIAL }, () => FLOW.CONFIRMING)
        .with({ state: SIGNAL_STATE.ENCRYPTED }, () => FLOW.CONNECTED)
        .otherwise(() => FLOW.CONNECTING),
    )
    .with({ status: SESSION_STATE.READY }, () => FLOW.READY)
    .with({ status: SESSION_STATE.CONNECTED }, () => FLOW.CONNECTED)
    .with({ status: SESSION_STATE.DISCONNECTED }, () => FLOW.DISCONNECTED)
    .otherwise(() => FLOW.ERROR);

export const ConnectionFlow = ({ onClose, onCopy }: ConnectionFlowProps) => {
  const { status: sessionStatus } = useSession();
  const { displayState } = useFlowTransition(reduceState(sessionStatus));

  return (
    <div style={{ viewTransitionName: "connection-flow" }} className="w-full">
      {match(displayState)
        .with(FLOW.CREATING, () => (
          <div className="flex flex-col items-center gap-4 p-6">
            <LoadingSpinner />
            <div className="text-center">
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Preparing connection
              </h3>
              <p className="text-gray-500 text-sm">Generating keys…</p>
            </div>
          </div>
        ))
        .with(FLOW.CONNECTING, () => (
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
        .with(FLOW.READY, () => <HandshakeOpen onCopy={onCopy} />)
        .with(FLOW.CONFIRMING, () => (
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="text-center">
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Establishing e2e encryption...
              </h3>
            </div>
          </div>
        ))
        .with(FLOW.CONNECTED, () => (
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
        .with(FLOW.DISCONNECTED, () => (
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
          <UnknownState state={sessionStatus} />
        ))}
    </div>
  );
};
