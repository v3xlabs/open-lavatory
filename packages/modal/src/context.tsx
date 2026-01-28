import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext, useMemo } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot.js";
import type { OpenLVModalElementProps } from "./element.js";
import {
  detectBrowserLanguage,
  type LanguageTag,
  TranslationProvider,
} from "./utils/i18n.jsx";

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
});

const getInitialLanguage = (
  provider: OpenLVProvider | undefined,
): LanguageTag => {
  const storedLanguage = provider?.storage.getSettings().language as
    | LanguageTag
    | undefined;

  if (storedLanguage) return storedLanguage;

  return detectBrowserLanguage();
};

export const ModalProvider: FC<OpenLVModalElementProps> = ({
  provider,
  onClose,
}) => {
  const initialLanguage = useMemo(
    () => getInitialLanguage(provider),
    [provider],
  );

  return (
    <TranslationProvider initialLanguageTag={initialLanguage}>
      <ModalContext.Provider value={{ provider }}>
        <ModalRoot onClose={onClose} />
      </ModalContext.Provider>
    </TranslationProvider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context.provider) throw new Error("Provider not found");

  return context;
};
