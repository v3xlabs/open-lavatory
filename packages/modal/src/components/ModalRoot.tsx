/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import classNames from "classnames";
import { useCallback, useEffect, useState } from "preact/hooks";
import { match, P } from "ts-pattern";

import { copyToClipboard } from "../hooks/useClipboard";
import { useProvider } from "../hooks/useProvider";
import { useSession } from "../hooks/useSession";
import { log } from "../utils/log";
import { ConnectionFlow } from "./ConnectionFlow";
import { Disconnected } from "./disconnected/Disconnected";
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

export const ModalRoot = ({ onClose = () => {}, onCopy }: ModalRootProps) => {
  const { view, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status } = useProvider();
  const title = "Connect Wallet";
  const continueLabel = "Save & continue";

  useEscapeToClose(onClose);

  const handleCopy = useCallback(async () => {
    const success = uri && (await copyToClipboard(uri));

    if (success) setCopied(true);
  }, [uri, setCopied]);

  log("view", view);

  return (
    <div
      className="fixed inset-0 z-[10000] flex animate-[bg-in_0.15s_ease-in-out] items-center justify-center bg-black/30 p-4 font-sans text-slate-800 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-openlv-modal-root
    >
      <div
        className="relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] space-y-4 rounded-2xl bg-gray-50 p-2 text-center"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <Header
          setView={setView}
          onToggleSettings={() =>
            setView(view === "settings" ? "start" : "settings")
          }
          title={title}
          view={view}
          onClose={onClose}
        />

        {match(status)
          .with("disconnected", () =>
            match(view)
              .with("start", () => <Disconnected />)
              .with("settings", () => (
                <ModalSettings
                  continueLabel={continueLabel}
                  onBack={() => setView("start")}
                />
              ))
              .otherwise(() => <UnknownState state={view} />),
          )
          .with(P.union("connecting", "connected"), () => (
            <ConnectionFlow onClose={onClose} onCopy={onCopy || handleCopy} />
          ))
          .otherwise(() => (
            <UnknownState state={"unknown status"} />
          ))}

        <div
          className={classNames(
            "absolute top-5 right-5 rounded-lg bg-blue-500 px-4 py-3 font-medium text-sm text-white transition-all",
            copied ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          )}
        >
          📋 Connection URL copied to clipboard!
        </div>

        <Footer />
      </div>
    </div>
  );
};
