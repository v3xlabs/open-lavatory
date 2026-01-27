import type { OpenLVProvider } from "@openlv/provider";
import { createContext } from "preact";
import type { FC } from "preact/compat";
import { useContext, useEffect } from "preact/hooks";

import { ModalRoot } from "./components/ModalRoot.js";
import { type OpenLVModalElementProps } from "./element.js";
import { updateStyles } from "./styles/index.js";
import type { ThemeConfig } from "./theme/types.js";

type ShadowRootModalProps = OpenLVModalElementProps & {
  shadowRoot: ShadowRoot;
};

export type ProviderContextO = {
  provider: OpenLVProvider | undefined;
};

export const ModalContext = createContext<ProviderContextO>({
  provider: undefined,
});

export const ModalProvider: FC<ShadowRootModalProps> = ({
  provider,
  onClose,
  shadowRoot,
}) => {
  const themeConfig = provider.themeConfig as ThemeConfig | undefined;

  useEffect(() => {
    if (!themeConfig || !shadowRoot) return;

    const update = () => {
      const userTheme = provider.storage.getSettings()?.theme ?? "system";

      updateStyles(shadowRoot, themeConfig, userTheme);
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    provider.storage.emitter.on("settings_change", update);
    mediaQuery.addEventListener("change", update);

    return () => {
      provider.storage.emitter.off("settings_change", update);
      mediaQuery.removeEventListener("change", update);
    };
  }, [provider, themeConfig, shadowRoot]);

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
