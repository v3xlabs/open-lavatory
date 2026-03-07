import type { OpenLVProvider } from "@openlv/provider";
import {
  type Component,
  createContext,
  useContext,
} from "solid-js";

import { ModalRoot } from "./components/ModalRoot.js";
import { type OpenLVModalElementProps } from "./element.js";
import type { ThemeConfig } from "./theme/types.js";
import {
  TranslationProvider,
} from "./utils/i18n.js";

export type ModalContextValue = {
  provider: OpenLVProvider;
  themeConfig?: ThemeConfig;
};

export const ModalContext = createContext<ModalContextValue | undefined>(
  undefined,
);

export const ModalProvider: Component<OpenLVModalElementProps> = (props) => {
  const { provider, theme } = props;

  return (
    <ModalContext.Provider value={{ provider, themeConfig: theme }}>
      <TranslationProvider>
        <ModalRoot onClose={props.onClose} />
      </TranslationProvider>
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context) throw new Error("Modal context not found");

  return context;
};
