import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot.js";
import { DEFAULT_THEME_CONFIG, type ThemeConfig, ThemeProvider } from "./theme/index.js";

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
});

export type ModalProviderProps = {
  provider: OpenLVProvider;
  theme?: ThemeConfig;
  onClose?: () => void;
};

export const ModalProvider: FC<ModalProviderProps> = ({
  provider,
  theme,
  onClose,
}) => {
  const themeConfig: ThemeConfig = theme ?? DEFAULT_THEME_CONFIG;

  return (
    <ModalContext.Provider value={{ provider }}>
      <ThemeProvider {...themeConfig}>
        <ModalRoot onClose={onClose} />
      </ThemeProvider>
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context.provider) throw new Error("Provider not found");

  return context;
};
