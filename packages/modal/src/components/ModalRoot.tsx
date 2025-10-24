import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import QRCode from "qrcode-generator";

import { OPENLV_ICON_128 } from "../assets/logo";
import {
  getDefaultModalPreferences,
  type ModalPreferences,
} from "../preferences";
import type { ConnectionInfo } from "../types/connection";
import { ConnectionFlow } from "./ConnectionFlow";
import { Header } from "./Header";
import { ModalSettings } from "./ModalSettings";

export interface ModalRootProps {
  uri?: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  initialPreferences?: ModalPreferences;
  onPreferencesChange?: (preferences: ModalPreferences) => void;
  continueLabel?: string;
  connectionInfo?: ConnectionInfo;
  onStartConnection?: () => void;
  onRetry?: () => void;
  onCopy?: (uri: string) => void;
}

type ModalView = "qr" | "settings";

type PreferenceKey = keyof ModalPreferences;

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      return true;
    }
  } catch (error) {
    console.warn("OpenLV modal: Clipboard API failed, falling back", error);
  }

  try {
    const textArea = document.createElement("textarea");

    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand("copy");

    document.body.removeChild(textArea);

    return result;
  } catch (fallbackError) {
    console.error("OpenLV modal: fallback copy failed", fallbackError);

    return false;
  }
};

const QrPreview = ({
  svg,
  blurred,
  isHovering,
  onHover,
  onCopy,
}: {
  svg: string;
  blurred: boolean;
  isHovering: boolean;
  onHover: (next: boolean) => void;
  onCopy: () => void;
}) => (
  <div
    className={`relative mx-auto flex w-fit items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-4 transition-shadow ${
      isHovering || !blurred ? "shadow-lg border-blue-500" : ""
    }`}
    title="Click to copy connection URL"
    onClick={(event) => {
      event.stopPropagation();
      onCopy();
    }}
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
  >
    <div
      className="flex h-[200px] w-[200px] items-center justify-center"
      style={{ filter: blurred && !isHovering ? "blur(8px)" : "none" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
    {blurred ? (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-gray-50/90 transition-opacity"
        style={{ opacity: isHovering ? 0 : 1 }}
      >
        <div className="mb-2 text-xl">🔒</div>
        <p className="mt-2 text-xs italic text-gray-500">Hover to reveal</p>
        <p className="mt-2 text-xs italic text-gray-500">Hidden for privacy</p>
      </div>
    ) : null}
  </div>
);

const ConnectionDetails = ({
  uri,
  svg,
  blurred,
  isQrHovering,
  onQrHover,
  isUrlHovering,
  onUrlHover,
  onCopy,
  subtitle,
  hint,
}: {
  uri: string;
  svg: string;
  blurred: boolean;
  isQrHovering: boolean;
  onQrHover: (next: boolean) => void;
  isUrlHovering: boolean;
  onUrlHover: (next: boolean) => void;
  onCopy: () => void;
  subtitle: string;
  hint: string;
}) => (
  <>
    <div className="mt-4 rounded-2xl bg-gray-50 p-4 shadow-lg">
      <QrPreview
        blurred={blurred}
        isHovering={isQrHovering}
        onCopy={onCopy}
        onHover={onQrHover}
        svg={svg}
      />
      <p className="mt-2 text-xs italic text-gray-500">{hint}</p>
    </div>
    <div
      className={`mt-4 cursor-pointer rounded-lg bg-gray-100 p-3 text-left transition-shadow ${
        isUrlHovering ? "shadow-lg" : ""
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onCopy();
      }}
      onMouseEnter={() => onUrlHover(true)}
      onMouseLeave={() => onUrlHover(false)}
      title="Click to copy connection URL"
    >
      <p className="text-xs font-semibold text-gray-700">Connection URL</p>
      <p className="mt-1 break-all text-xs text-gray-500">{uri}</p>
    </div>
    <p className="mt-4 text-sm text-gray-500">{subtitle}</p>
  </>
);

const useModalState = (
  uri: string,
  initialPreferences: ModalPreferences,
  onPreferencesChange?: (preferences: ModalPreferences) => void,
) => {
  const [view, setView] = useState<ModalView>("qr");
  const [copied, setCopied] = useState(false);
  const [isQrHovering, setIsQrHovering] = useState(false);
  const [isUrlHovering, setIsUrlHovering] = useState(false);
  const [preferences, setPreferences] =
    useState<ModalPreferences>(initialPreferences);

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    setView("qr");
  }, [uri]);

  const handlePreferenceToggle = useCallback(
    (key: PreferenceKey) => {
      setPreferences((current) => {
        const next = { ...current, [key]: !current[key] };

        onPreferencesChange?.(next);

        return next;
      });
    },
    [onPreferencesChange],
  );

  return {
    view,
    setView,
    copied,
    setCopied,
    isQrHovering,
    setIsQrHovering,
    isUrlHovering,
    setIsUrlHovering,
    preferences,
    handlePreferenceToggle,
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

export const ModalRoot = ({
  uri,
  title = "Connect Wallet",
  subtitle = "Scan QR code or copy URL to connect",
  onClose,
  initialPreferences = getDefaultModalPreferences(),
  onPreferencesChange,
  continueLabel = "Save & continue",
  connectionInfo,
  onStartConnection,
  onRetry,
  onCopy,
}: ModalRootProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const {
    view,
    setView,
    copied,
    setCopied,
    isQrHovering,
    setIsQrHovering,
    isUrlHovering,
    setIsUrlHovering,
    preferences,
    handlePreferenceToggle,
  } = useModalState(uri || "", initialPreferences, onPreferencesChange);

  const safeOnClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEscapeToClose(safeOnClose);

  const qrSvg = useMemo(() => {
    const qr = QRCode(0, "M");

    qr.addData(uri);
    qr.make();

    return qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
  }, [uri]);

  const privacyBlurEnabled = preferences.sessionPrivacy;
  const interactionHint = privacyBlurEnabled
    ? "QR code is blurred for privacy protection • Click to copy URL"
    : "QR code is visible • Click to copy connection URL";

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(uri);

    if (success) setCopied(true);
  }, [uri, setCopied]);

  const handleStartConnection = useCallback(() => {
    setIsStarting(true);
    // This will be handled by the connector - don't close the modal
    onStartConnection?.();
  }, [onStartConnection]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 font-sans text-slate-800"
      onClick={safeOnClose}
      role="presentation"
      data-openlv-modal-root
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl bg-gray-50 p-4 text-center shadow-xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <Header
          onBack={() => (view === "settings" ? setView("qr") : safeOnClose())}
          onToggleSettings={() =>
            setView(view === "settings" ? "qr" : "settings")
          }
          title={title}
          view={view}
        />

        {view === "qr" ? (
          connectionInfo ? (
            <ConnectionFlow
              connectionInfo={connectionInfo}
              onStartConnection={onStartConnection || (() => {})}
              onRetry={onRetry || (() => {})}
              onClose={safeOnClose}
              onCopy={onCopy || handleCopy}
            />
          ) : uri ? (
            <ConnectionDetails
              blurred={privacyBlurEnabled}
              isQrHovering={isQrHovering}
              isUrlHovering={isUrlHovering}
              onCopy={() => void handleCopy()}
              onQrHover={setIsQrHovering}
              onUrlHover={setIsUrlHovering}
              subtitle={subtitle}
              hint={interactionHint}
              svg={qrSvg}
              uri={uri}
            />
          ) : (
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
                onClick={handleStartConnection}
                disabled={isStarting}
                className="w-full rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? "Starting Connection..." : "Start Connection"}
              </button>
            </div>
          )
        ) : (
          <ModalSettings
            continueLabel={continueLabel}
            onBack={() => setView("qr")}
            onToggle={handlePreferenceToggle}
            preferences={preferences}
          />
        )}

        <div
          className={`absolute right-5 top-5 rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-all ${
            copied ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          }`}
        >
          📋 Connection URL copied to clipboard!
        </div>

        <div className="mt-6 flex items-center gap-2 text-gray-500">
          <a
            href="https://github.com/v3xlabs/open-lavatory"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-gray-500"
          >
            <img
              src={OPENLV_ICON_128}
              alt="Open Lavatory Logo"
              width={20}
              height={20}
              className="rounded"
            />
            <span>openlv</span>
          </a>
        </div>
      </div>
    </div>
  );
};
