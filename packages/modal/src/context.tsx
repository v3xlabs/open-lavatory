import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot.js";
import { ThemeProvider } from "./theme/index.js";
import { simpleTheme } from "./theme/simple.js";

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
});

export type ModalProviderProps = {
  provider: OpenLVProvider;
  onClose?: () => void;
};

export const ModalProvider: FC<ModalProviderProps> = ({
  provider,
  onClose,
}) => {
  return (
    <ModalContext.Provider value={{ provider }}>
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
