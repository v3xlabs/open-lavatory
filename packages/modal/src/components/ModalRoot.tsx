/** biome-ignore-all lint/a11y/noStaticElementInteractions: overlay requires click to close modal */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: escape listener handles keyboard interactions */

import { PROVIDER_STATUS } from "@openlv/provider";
import classNames from "classnames";
import {
  createEffect,
  createMemo,
  createSignal,
  Show,
  type JSX,
  onCleanup,
} from "solid-js";
import { match, P } from "ts-pattern";

import { ConnectionFlow } from "../flow/ConnectionFlow.js";
import { Disconnected } from "../flow/disconnected/Disconnected.js";
import { InfoScreen } from "../flow/InfoScreen.js";
import { copyToClipboard } from "../hooks/useClipboard.js";
import { useProvider } from "../hooks/useProvider.js";
import { usePunchTransition } from "../hooks/usePunchTransition.js";
import { useSession } from "../hooks/useSession.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useTranslation } from "../utils/i18n.js";
import { log } from "../utils/log.js";
import { Footer } from "./footer/Footer.js";
import { Header } from "./Header.js";
import { ModalSettings, type SettingsNavigationRef } from "./settings/index.js";
import { UnknownState } from "./UnknownState.js";

export interface ModalRootProps {
  onClose?: () => void;
  onStartConnection?: () => void;
  onCopy?: (uri: string) => void;
}

export type ModalView = "start" | "settings" | "info";

const useModalState = () => {
  const [view, setView] = createSignal<ModalView>("start");
  const [copied, setCopied] = createSignal(false);

  createEffect(() => {
    if (!copied()) return;

    const timeout = globalThis.setTimeout(() => setCopied(false), 2000);

    onCleanup(() => globalThis.clearTimeout(timeout));
  });

  return {
    view,
    setView,
    copied,
    setCopied,
  };
};

const useEscapeToClose = (handler: () => void) => {
  createEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler();
    };

    document.addEventListener("keydown", keyHandler);

    onCleanup(() => document.removeEventListener("keydown", keyHandler));
  });
};

const useDynamicDialogHeight = () => {
  const [contentNode, setContentNode] = createSignal<HTMLDivElement>();
  const [height, setHeight] = createSignal(0);

  const measureHeight = (
    targetElement?: HTMLElement | null,
    useScrollHeight = false,
  ) => {
    const node = targetElement || contentNode();

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
    }
  };

  createEffect(() => {
    const node = contentNode();

    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      measureHeight();
    });

    observer.observe(node);

    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    if (globalThis.window === undefined) return;

    const handleResize = () => {
      measureHeight();
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  return {
    setContentRef: setContentNode,
    contentNode,
    height,
    measureHeight,
  };
};

const ModalRootInner = ({
  onClose,
  onCopy,
}: {
  onClose: () => void;
  onCopy?: (uri: string) => void;
}) => {
  const { view: modalView, setView, copied, setCopied } = useModalState();
  const { uri } = useSession();
  const { status, provider } = useProvider();
  const { setContentRef, contentNode, height, measureHeight } =
    useDynamicDialogHeight();
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
  const openSettings = () => setView("settings");
  const { t, isRtl, languageTag } = useTranslation();
  const { themeMode } = useThemeConfig();

  const settingsNavRef: { current: SettingsNavigationRef | null } = {
    current: null,
  };
  const [settingsTitleKey, setSettingsTitleKey] =
    createSignal("settings.title");

  const title = createMemo(() =>
    match(modalView())
      .with("start", () => t("start.title"))
      .with("settings", () => t(settingsTitleKey()))
      .with("info", () => t("info.title"))
      .exhaustive(),
  );

  useEscapeToClose(onClose);

  createEffect(() => {
    if (status() === PROVIDER_STATUS.CONNECTED) {
      onClose();
    }
  });

  const handleCopy = async () => {
    const sessionUri = uri();
    const success = sessionUri && (await copyToClipboard(sessionUri));

    if (success) setCopied(true);
  };

  let isInitialMount = true;
  let initialMeasureTimeout: ReturnType<typeof setTimeout> | undefined;
  let previousHeight: number | undefined;
  let overflowTimeout: ReturnType<typeof setTimeout> | undefined;
  const [shouldHideOverflow, setShouldHideOverflow] = createSignal(false);

  createEffect(() => {
    displayedStatus();
    displayedModalView();
    const node = contentNode();

    if (!node) return;

    if (isInitialMount) {
      if (initialMeasureTimeout) {
        globalThis.clearTimeout(initialMeasureTimeout);
      }

      initialMeasureTimeout = globalThis.setTimeout(() => {
        if (contentNode()) {
          measureHeight(undefined, true);
          isInitialMount = false;
        }
      }, 0);
    } else {
      measureHeight();
    }

    onCleanup(() => {
      if (initialMeasureTimeout) {
        globalThis.clearTimeout(initialMeasureTimeout);
      }
    });
  });

  createEffect(() => {
    const currentHeight = height();
    const isHeightChanging =
      previousHeight !== undefined &&
      currentHeight !== previousHeight &&
      currentHeight > 0 &&
      previousHeight > 0 &&
      Math.abs(currentHeight - previousHeight) > 0.5;

    if (isHeightChanging) {
      setShouldHideOverflow(true);

      if (overflowTimeout) {
        globalThis.clearTimeout(overflowTimeout);
      }

      overflowTimeout = globalThis.setTimeout(() => {
        setShouldHideOverflow(false);
        overflowTimeout = undefined;
      }, 200);
    }

    previousHeight = currentHeight;

    onCleanup(() => {
      if (overflowTimeout) {
        globalThis.clearTimeout(overflowTimeout);
      }
    });
  });

  const closeSessionIfExists = () => {
    provider.closeSession();
  };

  const shouldShowBack = createMemo(
    () => !(modalView() === "start" && status() === PROVIDER_STATUS.STANDBY),
  );

  const onBack = () => {
    const currentView = modalView();
    const currentStatus = status();

    if (currentView === "start" && currentStatus === PROVIDER_STATUS.STANDBY) {
      return;
    }

    if (currentView === "start") {
      closeSessionIfExists();

      return;
    }

    if (currentView === "settings") {
      if (settingsNavRef.current && !settingsNavRef.current.isAtRoot) {
        settingsNavRef.current.goBack();

        return;
      }

      setView("start");

      return;
    }

    if (currentView === "info") {
      setView("start");

      return;
    }

    closeSessionIfExists();
    onClose();
  };

  const renderDisconnectedView = (targetView: ModalView): JSX.Element =>
    match(targetView)
      .with("start", () => <Disconnected onSettings={openSettings} />)
      .with("settings", () => (
        <ModalSettings
          onTitleChange={setSettingsTitleKey}
          navigationRef={settingsNavRef}
        />
      ))
      .with("info", () => <InfoScreen />)
      .otherwise(() => <UnknownState state={targetView} />);

  const renderDisconnectedSection = () => (
    <div class="modal-transition__container">
      <Show when={previousModalView()}>
        {(previousView) => (
          <div class="modal-transition__layer modal-transition__layer--outgoing">
            {renderDisconnectedView(previousView())}
          </div>
        )}
      </Show>
      <div
        class={classNames(
          "modal-transition__layer",
          isModalViewTransitioning() && "modal-transition__layer--incoming",
        )}
      >
        {renderDisconnectedView(displayedModalView())}
      </div>
    </div>
  );

  const renderStatusSection = (
    targetStatus: ReturnType<typeof status>,
  ): JSX.Element =>
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

  log("view", modalView());

  const overlayStyle: JSX.CSSProperties = {
    background: "var(--lv-overlay-background, rgba(0,0,0,0.3))",
    "backdrop-filter": "var(--lv-overlay-backdrop-filter, blur(4px))",
  };

  const cardStyle: JSX.CSSProperties = {
    background: "var(--lv-body-background)",
    color: "var(--lv-body-color, var(--lv-text-primary))",
    "border-radius": "var(--lv-border-radius, 16px)",
    "box-shadow": "var(--lv-modal-shadow, 0px 12px 32px rgba(0,0,0,0.25))",
  };

  return (
    <div
      class="fixed inset-0 z-10000 flex animate-[bg-in_0.15s_ease-in-out] items-end justify-center md:items-center lg:p-4"
      onClick={onClose}
      role="presentation"
      data-openlv-modal-root
      data-openlv-theme-mode={themeMode()}
      lang={languageTag()}
      dir={isRtl() ? "rtl" : "ltr"}
      style={overlayStyle}
    >
      <div
        class={classNames(
          "relative w-full max-w-[400px] animate-[fade-in_0.15s_ease-in-out] transition-[height] duration-200 ease-out",
          shouldHideOverflow() || previousStatus()
            ? "overflow-hidden"
            : undefined,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={String(title())}
        onClick={(event) => event.stopPropagation()}
        style={{
          ...(typeof height() === "number" && height() > 0
            ? { height: `${height()}px` }
            : {}),
          ...cardStyle,
        }}
      >
        <div ref={setContentRef}>
          <Header
            title={String(title())}
            view={modalView()}
            onClose={onClose}
            onBack={shouldShowBack() ? onBack : undefined}
            setView={setView}
          />
          <div class="modal-transition__container">
            <Show when={previousStatus()}>
              {(previous) => (
                <div class="modal-transition__layer modal-transition__layer--outgoing absolute">
                  <div class="flex flex-col text-center">
                    {renderStatusSection(previous())}
                  </div>
                </div>
              )}
            </Show>
            <div
              class={classNames(
                "modal-transition__layer",
                isStatusTransitioning() && "modal-transition__layer--incoming",
              )}
            >
              <div class="flex flex-col text-center">
                {renderStatusSection(displayedStatus())}
              </div>
            </div>
          </div>
          <Footer />
        </div>

        <div
          class={classNames(
            "absolute top-5 rounded-lg bg-blue-500 px-4 py-3 font-medium text-sm text-white transition-all ltr:right-5 rtl:left-5",
            copied()
              ? "translate-x-0 opacity-100"
              : "opacity-0 ltr:translate-x-full rtl:-translate-x-full",
          )}
        >
          {t("modal.urlCopied")}
        </div>
      </div>
    </div>
  );
};

export const ModalRoot = (props: ModalRootProps) => {
  const localOnClose = () => {
    props.onClose?.();
  };

  return <ModalRootInner onClose={localOnClose} onCopy={props.onCopy} />;
};
