import type { OpenLVProvider, ProviderStatus } from "@openlv/provider";
import type { ProviderStorage } from "@openlv/provider/storage";
import type { Session, SessionStateObject } from "@openlv/session";
import {
  type Accessor,
  type Component,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";

import { ModalRoot } from "./components/ModalRoot.js";
import { type OpenLVModalElementProps } from "./element.js";
import type { ThemeConfig } from "./theme/types.js";
import {
  detectBrowserLanguage,
  type LanguageTag,
  TranslationProvider,
  useTranslation,
} from "./utils/i18n.js";

export type ModalContextValue = {
  provider: OpenLVProvider;
  themeConfig?: ThemeConfig;
  providerStatus: Accessor<ProviderStatus>;
  session: Accessor<Session | undefined>;
  sessionState: Accessor<SessionStateObject | undefined>;
  settings: Accessor<ProviderStorage>;
  setSettings: (settings: ProviderStorage) => void;
};

export const ModalContext = createContext<ModalContextValue | undefined>(
  undefined,
);

const createModalState = (
  provider: OpenLVProvider,
  themeConfig?: ThemeConfig,
): ModalContextValue => {
  const [providerStatus, setProviderStatus] = createSignal<ProviderStatus>(
    provider.getState().status,
  );
  const [session, setSession] = createSignal<Session | undefined>(
    provider.getSession(),
  );
  const [sessionState, setSessionState] = createSignal<
    SessionStateObject | undefined
  >(session()?.getState());
  const [settings, setSettings] = createSignal<ProviderStorage>(
    provider.storage.getSettings(),
  );

  createEffect(() => {
    const onStatusChange = (status: ProviderStatus) => {
      setProviderStatus(status);
    };
    const onSessionStarted = (nextSession: Session) => {
      setSession(nextSession);
    };

    provider.on("status_change", onStatusChange);
    provider.on("session_started", onSessionStarted);
    setProviderStatus(provider.getState().status);
    setSession(provider.getSession());

    onCleanup(() => {
      provider.off("status_change", onStatusChange);
      provider.off("session_started", onSessionStarted);
    });
  });

  createEffect(() => {
    const currentSession = session();

    if (!currentSession) {
      setSessionState(undefined);

      return;
    }

    const onStateChange = (state?: SessionStateObject) => {
      setSessionState(state);
    };

    setSessionState(currentSession.getState());
    currentSession.emitter.on("state_change", onStateChange);

    onCleanup(() => {
      currentSession.emitter.off("state_change", onStateChange);
    });
  });

  createEffect(() => {
    const onSettingsChange = (nextSettings: ProviderStorage) => {
      setSettings(nextSettings);
    };

    provider.storage.emitter.on("settings_change", onSettingsChange);
    setSettings(provider.storage.getSettings());

    onCleanup(() => {
      provider.storage.emitter.off("settings_change", onSettingsChange);
    });
  });

  return {
    provider,
    themeConfig,
    providerStatus,
    session,
    sessionState,
    settings,
    setSettings,
  };
};

const ModalLanguageSync: Component = () => {
  const { settings } = useModalContext();
  const { setLanguageTag, languageTag } = useTranslation();

  createEffect(() => {
    const storedLanguage = settings().language as LanguageTag | undefined;

    if (!storedLanguage || storedLanguage === languageTag()) {
      return;
    }

    setLanguageTag(storedLanguage);
  });

  return null;
};

const getInitialLanguage = (
  provider: OpenLVProvider | undefined,
): LanguageTag => {
  const storedLanguage = provider?.storage.getSettings().language as
    | LanguageTag
    | undefined;

  if (storedLanguage) return storedLanguage;

  return detectBrowserLanguage();
};

export const ModalProvider: Component<OpenLVModalElementProps> = (props) => {
  const state = createModalState(props.provider, props.theme);
  const initialLanguage = getInitialLanguage(props.provider);

  return (
    <TranslationProvider initialLanguageTag={initialLanguage}>
      <ModalContext.Provider value={state}>
        <ModalLanguageSync />
        <ModalRoot onClose={props.onClose} />
      </ModalContext.Provider>
    </TranslationProvider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context) throw new Error("Modal context not found");

  return context;
};
