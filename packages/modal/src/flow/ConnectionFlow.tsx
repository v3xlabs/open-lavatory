import { SESSION_STATE, type SessionStateObject } from "@openlv/session";
import { SIGNAL_STATE } from "@openlv/signaling";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  Switch,
} from "solid-js";
import { match, P } from "ts-pattern";

import { UnknownState } from "../components/UnknownState.js";
import { useSession } from "../hooks/useSession.js";
import { useTranslation } from "../utils/i18n.js";
import { HandshakeOpen } from "./HandshakeOpen.js";

const supportsViewTransitions = () =>
  typeof document !== "undefined" && "startViewTransition" in document;

const startViewTransition = (callback: () => void) => {
  if (supportsViewTransitions()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition(callback);
  }
  else {
    callback();
  }
};

interface ConnectionFlowProps {
  onClose: () => void;
  onCopy: (uri: string) => void;
}

const LoadingSpinner = () => (
  <div class="flex items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
  </div>
);

const FLOW = {
  CREATING: "creating",
  CONNECTING: "connecting",
  READY: "ready",
  LINKING: "linking",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

type FlowState = (typeof FLOW)[keyof typeof FLOW];

const useFlowTransition = (currentState: () => FlowState) => {
  const initialState = currentState();
  const [displayState, setDisplayState] = createSignal(initialState);
  let previousStateRef = initialState;

  createEffect(() => {
    const nextState = currentState();

    if (nextState === previousStateRef) return;

    startViewTransition(() => {
      setDisplayState(nextState);
      previousStateRef = nextState;
    });
  });

  return {
    displayState,
  };
};

const reduceState = (state: SessionStateObject | undefined): FlowState => {
  if (!state) return FLOW.CONNECTING;

  return match(state)
    .with({ status: SESSION_STATE.CREATED }, () => FLOW.CREATING)
    .with(
      { status: SESSION_STATE.SIGNALING, signaling: P.select() },
      signaling =>
        match(signaling)
          .with({ state: SIGNAL_STATE.STANDBY }, () => FLOW.CONNECTING)
          .with({ state: SIGNAL_STATE.CONNECTING }, () => FLOW.CONNECTING)
          .with({ state: SIGNAL_STATE.READY }, () => FLOW.READY)
          .with({ state: SIGNAL_STATE.HANDSHAKE }, () => FLOW.LINKING)
          .with({ state: SIGNAL_STATE.HANDSHAKE_PARTIAL }, () => FLOW.LINKING)
          .with({ state: SIGNAL_STATE.ENCRYPTED }, () => FLOW.CONNECTED)
          .otherwise(() => FLOW.CONNECTING),
    )
    .with({ status: SESSION_STATE.READY }, () => FLOW.READY)
    .with({ status: SESSION_STATE.LINKING }, () => FLOW.LINKING)
    .with({ status: SESSION_STATE.CONNECTED }, () => FLOW.CONNECTED)
    .with({ status: SESSION_STATE.DISCONNECTED }, () => FLOW.DISCONNECTED)
    .otherwise(() => FLOW.ERROR);
};

export const ConnectionFlow = (props: ConnectionFlowProps) => {
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const flowState = createMemo(() => reduceState(sessionStatus()));
  const { displayState } = useFlowTransition(flowState);

  return (
    <div style={{ "view-transition-name": "connection-flow" }} class="w-full">
      <Switch fallback={<UnknownState state={sessionStatus()} />}>
        <Match when={displayState() === FLOW.CREATING}>
          <div class="flex flex-col items-center gap-4 p-6">
            <LoadingSpinner />
            <div class="text-center">
              <h3 class="mb-2 font-semibold text-(--lv-text-primary) text-lg">
                {t("connectionFlow.preparingConnection")}
              </h3>
              <p class="text-(--lv-text-muted) text-sm">
                {t("connectionFlow.generatingKeys")}
              </p>
            </div>
          </div>
        </Match>
        <Match when={displayState() === FLOW.CONNECTING}>
          <div class="flex flex-col items-center gap-4 p-6">
            <LoadingSpinner />
            <div class="text-center">
              <h3 class="mb-2 font-semibold text-(--lv-text-primary) text-lg">
                {t("connectionFlow.connecting")}
              </h3>
              <p class="text-(--lv-text-muted) text-sm">
                {t("connectionFlow.waitingForNetwork")}
              </p>
            </div>
          </div>
        </Match>
        <Match when={displayState() === FLOW.READY}>
          <HandshakeOpen onCopy={props.onCopy} />
        </Match>
        <Match when={displayState() === FLOW.LINKING}>
          <div class="flex flex-col items-center gap-4 p-6">
            <LoadingSpinner />
            <div class="text-center">
              <h3 class="mb-2 font-semibold text-(--lv-text-primary) text-lg">
                {t("connectionFlow.establishingConnection")}
              </h3>
              <p class="text-(--lv-text-muted) text-sm">
                {t("connectionFlow.mayTakeFewSeconds")}
              </p>
            </div>
          </div>
        </Match>
        <Match when={displayState() === FLOW.CONNECTED}>
          <div class="flex flex-col items-center gap-4 p-6">
            <div class="text-center">
              <div class="mb-4 text-4xl">✅</div>
              <h3 class="mb-2 font-semibold text-(--lv-text-primary) text-lg">
                {t("connectionFlow.connectedSuccessfully")}
              </h3>
              <p class="text-(--lv-text-muted) text-sm">
                {t("connectionFlow.walletConnectedReady")}
              </p>
            </div>
          </div>
        </Match>
        <Match when={displayState() === FLOW.DISCONNECTED}>
          <div class="flex flex-col items-center gap-4 p-6">
            <div class="text-center">
              <div class="mb-4 text-4xl">🔌</div>
              <h3 class="mb-2 font-semibold text-(--lv-text-primary) text-lg">
                {t("connectionFlow.disconnected")}
              </h3>
              <p class="mb-4 text-(--lv-text-muted) text-sm">
                {t("connectionFlow.connectionClosed")}
              </p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="w-full rounded-lg bg-(--lv-control-button-secondary-background) px-4 py-2 font-semibold text-(--lv-text-primary) text-sm transition hover:bg-(--lv-control-button-primary-background-hover)"
            >
              {t("common.close")}
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
