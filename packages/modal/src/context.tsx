import type { OpenLVProvider } from "@openlv/provider";
import type { ProviderStorage } from "@openlv/provider/storage";
import {
  type Component,
  createContext,
  createEffect,
  useContext,
} from "solid-js";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";

import { ModalRoot } from "./components/ModalRoot.js";
import { type OpenLVModalElementProps } from "./element.js";
import type { ThemeConfig } from "./theme/types.js";
import {
  TranslationProvider,
} from "./utils/i18n.js";

export type ModalContextValue = {
  provider: OpenLVProvider;
  themeConfig?: ThemeConfig;
  settings: [() => Store<ProviderStorage>, SetStoreFunction<ProviderStorage>];
};

export const ModalContext = createContext<ModalContextValue | undefined>(
  undefined,
);

export const ModalProvider: Component<OpenLVModalElementProps> = (props) => {
  const { provider, theme } = props;
  const [settings, setSettings] = createStore<ProviderStorage>(provider.storage.getSettings());

  createEffect(() => {
    provider.storage.setSettings(settings);
  });

  return (
    <ModalContext.Provider value={{ provider, themeConfig: theme, settings: [() => settings, setSettings] }}>
      <TranslationProvider>
        <ModalRoot onClose={props.onClose ?? (() => {})} />
      </TranslationProvider>
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context) throw new Error("Modal context not found");

  return context;
};
