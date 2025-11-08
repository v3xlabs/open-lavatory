import type { ConnectorStorage } from "@openlv/core";
import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot";
import { ThemeProvider } from "./theme";
import { simpleTheme } from "./theme/simple";

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
  storage: ConnectorStorage | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
  storage: undefined,
});

export type ModalProviderProps = {
  provider: OpenLVProvider;
  storage: ConnectorStorage;
  onClose?: () => void;
};

export const ModalProvider: FC<ModalProviderProps> = ({
  provider,
  storage,
  onClose,
}) => {
  return (
    <ModalContext.Provider value={{ provider, storage }}>
      <ThemeProvider theme={simpleTheme}>
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
