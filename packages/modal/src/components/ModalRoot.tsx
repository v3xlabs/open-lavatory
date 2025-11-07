/** biome-ignore-all lint/a11y/noStaticElementInteractions: overlay requires click to close modal */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: escape listener handles keyboard interactions */

import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "preact/hooks";
import { match, P } from "ts-pattern";

import { ConnectionFlow } from "../flow/ConnectionFlow";
import { Disconnected } from "../flow/disconnected/Disconnected";
import { copyToClipboard } from "../hooks/useClipboard";
import { useProvider } from "../hooks/useProvider";
import { useSession } from "../hooks/useSession";
import { log } from "../utils/log";
import { Footer } from "./footer/Footer";
import { Header } from "./Header";
import { ModalSettings } from "./settings";
import { UnknownState } from "./UnknownState";

export interface ModalRootProps {
  onClose?: () => void;
  onStartConnection?: () => void;
  onCopy?: (uri: string) => void;
}

type ModalView = "start" | "settings";

const TRANSITION_DURATION_MS = 220;

type TransitionDirection = "forward" | "backward";

type ViewState =
  | {
      status: "stable";
      view: ModalView;
    }
  | {
      status: "transitioning";
      from: ModalView;
      to: ModalView;
      direction: TransitionDirection;
    };

const getDirection = (from: ModalView, to: ModalView): TransitionDirection =>
  match<[ModalView, ModalView], TransitionDirection>([from, to])
    .with(["start", "settings"], () => "forward")
    .with(["settings", "start"], () => "backward")
    .otherwise(() => "forward");

const useModalState = () => {
  const [view, setView] = useState<ModalView>("start");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  return {
    view,
    setView,
    copied,
    setCopied,
  };
};

const useEscapeToClose = (handler: () => void) => {
  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler();
    };

    document.addEventListener("keydown", keyHandler);

    return () => document.removeEventListener("keydown", keyHandler);
  }, [handler]);
};

const useDynamicDialogHeight = () => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>();

  const measureHeight = useCallback(() => {
    const node = contentRef.current;

    if (!node) return;

    const nextHeight = node.getBoundingClientRect().height;

    setHeight((previousHeight) =>
      typeof previousHeight === "number" &&
      Math.abs(previousHeight - nextHeight) < 0.5
        ? previousHeight
        : nextHeight,
    );
  }, []);

  useLayoutEffect(() => {
    measureHeight();
  }, [measureHeight]);

  useLayoutEffect(() => {
    const node = contentRef.current;

    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      measureHeight();
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [measureHeight]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      measureHeight();
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [measureHeight]);

  return {
    contentRef,
    height,
    measureHeight,
  };
};

export const ModalRoot = ({ onClose = () => {}, onCopy }: ModalRootProps) => {
  const { view: modalView, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status } = useProvider();
  let title = "Connect Wallet";
  const { contentRef, height, measureHeight } = useDynamicDialogHeight();
  const [viewState, setViewState] = useState<ViewState>({
    status: "stable",
    view: modalView,
  });
  const transitionTimeoutRef = useRef<number>();

  title = match(modalView)
    .with("start", () => "Connect Wallet")
    .with("settings", () => "Settings")
    .exhaustive();

  useEscapeToClose(onClose);

  const handleCopy = useCallback(async () => {
    const success = uri && (await copyToClipboard(uri));

    if (success) setCopied(true);
  }, [uri, setCopied]);

  useEffect(() => {
    setViewState((state) =>
      match<ViewState, ViewState>(state)
        .with({ status: "stable" }, (stable) =>
          stable.view === modalView
            ? stable
            : {
                status: "transitioning",
                from: stable.view,
                to: modalView,
                direction: getDirection(stable.view, modalView),
              },
        )
        .with({ status: "transitioning" }, (transitioning) =>
          transitioning.to === modalView
            ? transitioning
            : {
                status: "transitioning",
                from: transitioning.to,
                to: modalView,
                direction: getDirection(transitioning.to, modalView),
              },
        )
        .exhaustive(),
    );
  }, [modalView]);

  useEffect(() => {
    if (viewState.status !== "transitioning") {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = undefined;
      }

      return;
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setViewState({ status: "stable", view: viewState.to });
    }, TRANSITION_DURATION_MS);

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = undefined;
      }
    };
  }, [viewState]);

  const activeView = match(viewState)
    .with({ status: "stable" }, (stable) => stable.view)
    .with({ status: "transitioning" }, (transitioning) => transitioning.to)
    .exhaustive();

  const exitingView = match(viewState)
    .with({ status: "transitioning" }, (transitioning) => transitioning.from)
    .with(P._, () => null)
    .exhaustive();

  const transitionDirection = match(viewState)
    .with(
      { status: "transitioning" },
      (transitioning) => transitioning.direction,
    )
    .with(P._, () => "forward" as const)
    .exhaustive();

  const isTransitioning = viewState.status === "transitioning";

  useLayoutEffect(() => {
    measureHeight();
  }, [measureHeight, status, activeView]);

  const renderDisconnectedView = (targetView: ModalView) =>
    match(targetView)
      .with("start", () => (
        <Disconnected onSettings={() => setView("settings")} />
      ))
      .with("settings", () => <ModalSettings />)
      .with(P._, (unknown) => <UnknownState state={unknown} />)
      .exhaustive();

  const enterAnimationClass = match({ isTransitioning, transitionDirection })
    .with(
      { isTransitioning: true, transitionDirection: "forward" },
      () => "animate-[modal-view-enter-forward_0.22s_ease-out_forwards]",
    )
    .with(
      { isTransitioning: true, transitionDirection: "backward" },
      () => "animate-[modal-view-enter-backward_0.22s_ease-out_forwards]",
    )
    .with(P._, () => undefined)
    .exhaustive();

  const exitAnimationClass = match({ isTransitioning, transitionDirection })
    .with(
      { isTransitioning: true, transitionDirection: "forward" },
      () => "animate-[modal-view-exit-forward_0.22s_ease-out_forwards]",
    )
    .with(
      { isTransitioning: true, transitionDirection: "backward" },
      () => "animate-[modal-view-exit-backward_0.22s_ease-out_forwards]",
    )
    .with(P._, () => undefined)
    .exhaustive();

  log("view", modalView);

  return (
    <div
      className="fixed inset-0 z-[10000] flex animate-[bg-in_0.15s_ease-in-out] items-center justify-center bg-black/30 p-4 font-sans text-slate-800 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-openlv-modal-root
    >
      <div
        className={classNames(
          "relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] rounded-2xl bg-white transition-[height] duration-200 ease-in-out",
          viewState.status === "transitioning" ? "overflow-hidden" : undefined,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={
          typeof height === "number" ? { height: `${height}px` } : undefined
        }
      >
        <div ref={contentRef} className="flex flex-col p-3 text-center">
          <Header
            setView={setView}
            title={title}
            view={modalView}
            onClose={onClose}
          />

          {match(status)
            .with("disconnected", () => (
              <div className="relative">
                <div
                  key={`active-${activeView}`}
                  className={classNames(
                    "relative w-full will-change-transform",
                    enterAnimationClass,
                  )}
                >
                  {renderDisconnectedView(activeView)}
                </div>

                {exitingView ? (
                  <div
                    key={`exit-${exitingView}`}
                    className={classNames(
                      "pointer-events-none absolute inset-0 will-change-transform",
                      exitAnimationClass,
                    )}
                  >
                    {renderDisconnectedView(exitingView)}
                  </div>
                ) : null}
              </div>
            ))
            .with(P.union("connecting", "connected"), () => (
              <ConnectionFlow onClose={onClose} onCopy={onCopy || handleCopy} />
            ))
            .otherwise(() => (
              <UnknownState state={"unknown status"} />
            ))}

          <Footer />
        </div>

        <div
          className={classNames(
            "absolute top-5 right-5 rounded-lg bg-blue-500 px-4 py-3 font-medium text-sm text-white transition-all",
            copied ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          )}
        >
          📋 Connection URL copied to clipboard!
        </div>
      </div>
    </div>
  );
};
