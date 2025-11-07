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
  const { view, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status } = useProvider();
  const title = "Connect Wallet";
  const { contentRef, height, measureHeight } = useDynamicDialogHeight();
  const {
    contentRef: footerRef,
    height: footerHeight,
    measureHeight: measureFooterHeight,
  } = useDynamicDialogHeight();

  useEscapeToClose(onClose);

  const handleCopy = useCallback(async () => {
    const success = uri && (await copyToClipboard(uri));

    if (success) setCopied(true);
  }, [uri, setCopied]);

  useLayoutEffect(() => {
    measureHeight();
  }, [measureHeight, status, view]);

  log("view", view);

  return (
    <div
      className="fixed inset-0 z-[10000] flex animate-[bg-in_0.15s_ease-in-out] items-center justify-center bg-black/30 p-4 font-sans text-slate-800 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-openlv-modal-root
    >
      <div
        className="relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] overflow-hidden rounded-2xl bg-white transition-[height] duration-200 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={
          typeof height === "number" && typeof footerHeight === "number"
            ? { height: `${height + footerHeight}px` }
            : undefined
        }
      >
        <div className="flex flex-col justify-between">
          <div ref={contentRef} className="p-2 text-center">
            <Header
              setView={setView}
              title={title}
              view={view}
              onClose={onClose}
            />

            {match(status)
              .with("disconnected", () =>
                match(view)
                  .with("start", () => (
                    <Disconnected onSettings={() => setView("settings")} />
                  ))
                  .with("settings", () => <ModalSettings />)
                  .otherwise(() => <UnknownState state={view} />),
              )
              .with(P.union("connecting", "connected"), () => (
                <ConnectionFlow
                  onClose={onClose}
                  onCopy={onCopy || handleCopy}
                />
              ))
              .otherwise(() => (
                <UnknownState state={"unknown status"} />
              ))}
          </div>
          <div ref={footerRef} className="absolute inset-x-0 bottom-0 p-2">
            <Footer />
          </div>
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
