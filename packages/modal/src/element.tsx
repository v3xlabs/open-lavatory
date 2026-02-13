import type { OpenLVProvider } from "@openlv/provider";
import { h, render } from "preact";

import { ModalProvider } from "./context.js";
import { updateStyles } from "./styles/index.js";
import type { ThemeConfig } from "./theme/types.js";
import type { ModalConnectionInterface } from "./types/connection.js";

export type OpenLVModalElementProps = {
  provider: OpenLVProvider;
  onClose?: () => void;
  theme?: ThemeConfig;
};

export class OpenLVModalElement
  extends HTMLElement
  implements ModalConnectionInterface {
  private readonly shadow: ShadowRoot;
  private renderRequested = false;
  private readonly parameters: OpenLVModalElementProps;
  private themeCleanup?: () => void;

  constructor(parameters: OpenLVModalElementProps) {
    super();
    this.parameters = parameters;

    this.shadow = this.attachShadow({ mode: "open" });
    const initialUserTheme
      = parameters.provider.storage.getSettings()?.theme ?? "system";

    void updateStyles(this.shadow, parameters.theme, initialUserTheme);
  }

  connectedCallback() {
    this.requestRender();
    this.themeCleanup?.();
    this.setupThemeListener();
  }

  disconnectedCallback() {
    render(undefined, this.shadow);
    this.themeCleanup?.();
  }

  private setupThemeListener() {
    const update = () => {
      const userTheme
        = this.parameters.provider.storage.getSettings()?.theme ?? "system";

      void updateStyles(this.shadow, this.parameters.theme, userTheme);
    };

    this.parameters.provider.storage.emitter.on("settings_change", update);

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", update);

    this.themeCleanup = () => {
      this.parameters.provider.storage.emitter.off("settings_change", update);
      mediaQuery.removeEventListener("change", update);
    };
  }

  showModal() {
    this.style.display = "block";
  }

  hideModal() {
    this.style.display = "none";
  }

  private requestRender() {
    if (this.renderRequested) {
      return;
    }

    this.renderRequested = true;
    queueMicrotask(() => {
      this.renderRequested = false;
      this.performRender();
    });
  }

  private performRender() {
    render(h(ModalProvider, this.parameters), this.shadow);
  }
}

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElement;
