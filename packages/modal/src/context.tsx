import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot.js";
import type { OpenLVModalElementProps } from "./element.js";

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
});

export const ModalProvider: FC<OpenLVModalElementProps> = ({
  provider,
  onClose,
}) => {
  return (
    <ModalContext.Provider value={{ provider }}>
      <ModalRoot onClose={onClose} />
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);

  if (!context.provider) throw new Error("Provider not found");

  return context;
};
