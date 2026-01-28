/** biome-ignore-all lint/a11y/noStaticElementInteractions: overlay requires click to close modal */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: escape listener handles keyboard interactions */

import { PROVIDER_STATUS } from "@openlv/provider";
import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "preact/hooks";
import { match, P } from "ts-pattern";

import { ConnectionFlow } from "../flow/ConnectionFlow.js";
import { Disconnected } from "../flow/disconnected/Disconnected.js";
import { InfoScreen } from "../flow/InfoScreen.js";
import { copyToClipboard } from "../hooks/useClipboard.js";
import { useProvider } from "../hooks/useProvider.js";
import { usePunchTransition } from "../hooks/usePunchTransition.js";
import { useSession } from "../hooks/useSession.js";
import { useTranslation } from "../utils/i18n.jsx";
import { log } from "../utils/log.js";
import { Footer } from "./footer/Footer.js";
import { Header } from "./Header.js";
import { ModalSettings } from "./settings/index.js";
import { UnknownState } from "./UnknownState.js";

export interface ModalRootProps {
  onClose?: () => void;
  onStartConnection?: () => void;
  onCopy?: (uri: string) => void;
}

export type ModalView = "start" | "settings" | "info";

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
  const [height, setHeight] = useState<number>(0);
  const hasMeasuredRef = useRef(false);

  const measureHeight = useCallback(
    (targetElement?: HTMLElement | null, useScrollHeight = false) => {
      const node = targetElement || contentRef.current;

      if (!node) return;

      const nextHeight = useScrollHeight
        ? node.scrollHeight
        : node.getBoundingClientRect().height;

      if (nextHeight > 0) {
        setHeight((previousHeight) =>
          typeof previousHeight === "number" &&
          Math.abs(previousHeight - nextHeight) < 0.5
            ? previousHeight
            : nextHeight,
        );
        hasMeasuredRef.current = true;
      }
    },
    [],
  );

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

export const ModalRoot = ({ onClose = () => {}, onCopy }: ModalRootProps) => {
  const { view: modalView, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status, provider } = useProvider();
  const { contentRef, height, measureHeight } = useDynamicDialogHeight();
  const {
    current: displayedModalView,
    previous: previousModalView,
    isTransitioning: isModalViewTransitioning,
  } = usePunchTransition(modalView);
  const {
    current: displayedStatus,
    previous: previousStatus,
    isTransitioning: isStatusTransitioning,
  } = usePunchTransition(status);
  const openSettings = useCallback(() => setView("settings"), [setView]);
  const { t } = useTranslation();

  const title = match(modalView)
    .with("start", () => t("start.title"))
    .with("settings", () => t("settings.title"))
    .with("info", () => t("info.title"))
    .exhaustive();

  useEscapeToClose(onClose);

  // Auto-dismiss modal when connection is established
  useEffect(() => {
    if (status === PROVIDER_STATUS.CONNECTED) {
      onClose();
    }
  }, [status, onClose]);

  const handleCopy = useCallback(async () => {
    const success = uri && (await copyToClipboard(uri));

    if (success) setCopied(true);
  }, [uri, setCopied]);

  const isInitialMountRef = useRef(true);
  const initialMeasureTimeoutRef = useRef<number>();
  const previousHeightRef = useRef<number | undefined>(undefined);
  const [shouldHideOverflow, setShouldHideOverflow] = useState(false);
  const overflowTimeoutRef = useRef<number>();

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    if (isInitialMountRef.current) {
      if (initialMeasureTimeoutRef.current) {
        window.clearTimeout(initialMeasureTimeoutRef.current);
      }

      initialMeasureTimeoutRef.current = window.setTimeout(() => {
        if (contentRef.current) {
          measureHeight(undefined, true);
          isInitialMountRef.current = false;
        }
      }, 0);
    } else {
      measureHeight();
    }

    return () => {
      if (initialMeasureTimeoutRef.current) {
        window.clearTimeout(initialMeasureTimeoutRef.current);
      }
    };
  }, [measureHeight, displayedStatus, displayedModalView]);

  // Manage overflow-hidden during height transitions
  useEffect(() => {
    const isHeightChanging =
      previousHeightRef.current !== undefined &&
      height !== previousHeightRef.current &&
      height > 0 &&
      previousHeightRef.current > 0 &&
      Math.abs(height - previousHeightRef.current) > 0.5;

    if (isHeightChanging) {
      setShouldHideOverflow(true);

      if (overflowTimeoutRef.current) {
        window.clearTimeout(overflowTimeoutRef.current);
      }

      // Remove overflow-hidden after CSS transition completes (200ms)
      overflowTimeoutRef.current = window.setTimeout(() => {
        setShouldHideOverflow(false);
        overflowTimeoutRef.current = undefined;
      }, 200);
    }

    previousHeightRef.current = height;

    return () => {
      if (overflowTimeoutRef.current) {
        window.clearTimeout(overflowTimeoutRef.current);
      }
    };
  }, [height]);

  const closeSessionIfExists = () => {
    provider?.closeSession();
  };

  const onBack = match({ view: modalView, status })
    .with({ view: "start", status: PROVIDER_STATUS.STANDBY }, () => undefined)
    .with({ view: "start" }, () => closeSessionIfExists)
    .with({ view: "settings" }, () => () => setView("start"))
    .with({ view: "info" }, () => () => setView("start"))
    .otherwise(() => () => {
      closeSessionIfExists();
      onClose();
    });

  const renderDisconnectedView = (targetView: ModalView) =>
    match(targetView)
      .with("start", () => <Disconnected onSettings={openSettings} />)
      .with("settings", () => <ModalSettings />)
      .with("info", () => <InfoScreen />)
      .otherwise(() => <UnknownState state={targetView} />);

  const renderDisconnectedSection = () => (
    <div className="modal-transition__container">
      {previousModalView && (
        <div className="modal-transition__layer modal-transition__layer--outgoing">
          {renderDisconnectedView(previousModalView)}
        </div>
      )}
      <div
        className={classNames(
          "modal-transition__layer",
          isModalViewTransitioning && "modal-transition__layer--incoming",
        )}
      >
        {renderDisconnectedView(displayedModalView)}
      </div>
    </div>
  );

  const renderStatusSection = (targetStatus: typeof status) =>
    match(targetStatus)
      .with(PROVIDER_STATUS.STANDBY, () => renderDisconnectedSection())
      .with(
        P.union(
          PROVIDER_STATUS.CREATING,
          PROVIDER_STATUS.CONNECTING,
          PROVIDER_STATUS.CONNECTED,
        ),
        () => (
          <ConnectionFlow onClose={onClose} onCopy={onCopy || handleCopy} />
        ),
      )
      .otherwise((state) => <UnknownState state={state || "unknown status"} />);

  log("view", modalView);

  const overlayStyle: Record<string, string> = {
    background: "var(--lv-overlay-background, rgba(0,0,0,0.3))",
    backdropFilter: "var(--lv-overlay-backdrop-filter, blur(4px))",
  };

  const cardStyle: Record<string, string> = {
    background: "var(--lv-body-background)",
    color: "var(--lv-body-color, var(--lv-text-primary))",
    borderRadius: "var(--lv-border-radius, 16px)",
    boxShadow: "var(--lv-modal-shadow, 0px 12px 32px rgba(0,0,0,0.25))",
  };

  return (
    <div
      className="fixed inset-0 z-10000 flex animate-[bg-in_0.15s_ease-in-out] items-end justify-center font-sans md:items-center lg:p-4"
      onClick={onClose}
      role="presentation"
      data-openlv-modal-root
      style={overlayStyle}
    >
      <div
        className={classNames(
          "relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] transition-[height] duration-200 ease-out",
          shouldHideOverflow || previousStatus ? "overflow-hidden" : undefined,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          ...(typeof height === "number" && height > 0
            ? { height: `${height}px` }
            : {}),
          ...cardStyle,
        }}
      >
        <div ref={contentRef}>
          <Header
            title={title}
            view={modalView}
            onClose={onClose}
            onBack={onBack}
            setView={setView}
          />
          <div className="modal-transition__container">
            {previousStatus && (
              <div className="modal-transition__layer modal-transition__layer--outgoing absolute">
                <div className="flex flex-col text-center">
                  {renderStatusSection(previousStatus)}
                </div>
              </div>
            )}
            <div
              className={classNames(
                "modal-transition__layer",
                isStatusTransitioning && "modal-transition__layer--incoming",
              )}
            >
              <div className="flex flex-col text-center">
                {renderStatusSection(displayedStatus)}
              </div>
            </div>
          </div>
          <Footer />
        </div>

        <div
          className={classNames(
            "absolute top-5 right-5 rounded-lg bg-blue-500 px-4 py-3 font-medium text-sm text-white transition-all",
            copied ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          )}
        >
          {t("modal.urlCopied")}
        </div>
      </div>
    </div>
  );
};
