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
import { match } from "ts-pattern";

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

const TRANSITION_DURATION_MS = 200;

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

  const measureHeight = useCallback((targetElement?: HTMLElement | null) => {
    const node = targetElement || contentRef.current;

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
    setHeight,
  };
};

const useViewTransition = (currentView: ModalView) => {
  const [displayView, setDisplayView] = useState(currentView);
  const [previousView, setPreviousView] = useState<ModalView | null>(null);
  const previousCurrentViewRef = useRef<ModalView>(currentView);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    if (currentView === previousCurrentViewRef.current) return;

    setPreviousView(previousCurrentViewRef.current);
    setDisplayView(currentView);
    previousCurrentViewRef.current = currentView;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setPreviousView(null);
    }, TRANSITION_DURATION_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [currentView]);

  return {
    displayView,
    previousView,
    isTransitioning: previousView !== null,
  };
};

export const ModalRoot = ({ onClose = () => {}, onCopy }: ModalRootProps) => {
  const { view: modalView, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status } = useProvider();
  const { contentRef, height, measureHeight, setHeight } =
    useDynamicDialogHeight();

  const { displayView, previousView, isTransitioning } =
    useViewTransition(modalView);

  const title = match(modalView)
    .with("start", () => "Connect Wallet")
    .with("settings", () => "Settings")
    .exhaustive();

  useEscapeToClose(onClose);

  const handleCopy = useCallback(async () => {
    const success = uri && (await copyToClipboard(uri));

    if (success) setCopied(true);
  }, [uri, setCopied]);

  const newViewRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (
      status === "disconnected" &&
      isTransitioning &&
      newViewRef.current &&
      contentRef.current
    ) {
      const newViewHeight = newViewRef.current.getBoundingClientRect().height;
      const container = contentRef.current;
      const header = container.firstElementChild as HTMLElement;
      const footer = container.lastElementChild as HTMLElement;
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const footerHeight = footer?.getBoundingClientRect().height || 0;
      const padding = 24;
      const totalHeight = newViewHeight + headerHeight + footerHeight + padding;

      setHeight(totalHeight);
    } else {
      measureHeight();
    }
  }, [
    measureHeight,
    setHeight,
    status,
    displayView,
    isTransitioning,
    contentRef,
  ]);

  const renderDisconnectedView = (targetView: ModalView) =>
    match(targetView)
      .with("start", () => (
        <Disconnected onSettings={() => setView("settings")} />
      ))
      .with("settings", () => <ModalSettings />)
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
          "relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] rounded-2xl bg-white transition-[height] duration-[200ms] ease-out",
          isTransitioning ? "overflow-hidden" : undefined,
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
              <div className="relative w-full">
                <div
                  ref={newViewRef}
                  className={classNames(
                    "w-full",
                    isTransitioning &&
                      "animate-[view-enter_0.2s_ease-out_forwards]",
                  )}
                >
                  {renderDisconnectedView(displayView)}
                </div>

                {previousView && previousView !== displayView && (
                  <div className="pointer-events-none absolute inset-0 w-full animate-[view-exit_0.2s_ease-out_forwards]">
                    {renderDisconnectedView(previousView)}
                  </div>
                )}
              </div>
            ))
            .with("connecting", () => (
              <ConnectionFlow onClose={onClose} onCopy={onCopy || handleCopy} />
            ))
            .with("connected", () => (
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
