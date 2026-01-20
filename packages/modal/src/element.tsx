import type { OpenLVProvider } from "@openlv/provider";
import { h, render } from "preact";

import { ModalProvider } from "./context.js";
import { ensureStyles } from "./styles/index.js";
import type { ThemeConfig } from "./theme/types.js";
import type { ModalConnectionInterface } from "./types/connection.js";

export type OpenLVModalElementProps = {
  provider: OpenLVProvider;
  onClose?: () => void;
  theme?: ThemeConfig;
};

export class OpenLVModalElement
  extends HTMLElement
  implements ModalConnectionInterface
{
  private readonly shadow: ShadowRoot;
  private renderRequested = false;
  private readonly parameters: OpenLVModalElementProps;

  constructor(parameters: OpenLVModalElementProps) {
    super();
    this.parameters = parameters;

    this.shadow = this.attachShadow({ mode: "open" });
    const initialUserTheme =
      parameters.provider.storage.getSettings()?.theme ?? "system";

    void ensureStyles(this.shadow, this.parameters.theme, initialUserTheme);
  }

  connectedCallback() {
    this.requestRender();
  }

  disconnectedCallback() {
    render(null, this.shadow);
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
    render(
      h(ModalProvider, { ...this.parameters, shadowRoot: this.shadow }),
      this.shadow,
    );
  }
}

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElement;
