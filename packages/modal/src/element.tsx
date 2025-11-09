import type { OpenLVProvider } from "@openlv/provider";
import { h, render } from "preact";

import { ModalProvider } from "./context.js";
import { ensureStyles } from "./styles/index.js";
import type { OpenLVTheme } from "./theme/index.js";
import { simpleTheme } from "./theme/simple.js";
import type { ModalConnectionInterface } from "./types/connection.js";

export class OpenLVModalElement
  extends HTMLElement
  implements ModalConnectionInterface
{
  public onClose?: () => void;
  public provider: OpenLVProvider;
  public theme: OpenLVTheme;

  private readonly shadow: ShadowRoot;
  private renderRequested = false;

  constructor(
    _provider: OpenLVProvider,
    _theme: OpenLVTheme = simpleTheme,
    _onClose: () => void = () => {},
  ) {
    super();
    this.provider = _provider;
    this.theme = _theme;
    this.onClose = _onClose;
    this.shadow = this.attachShadow({ mode: "open" });
    ensureStyles(this.shadow, this.theme);
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
      h(ModalProvider, {
        onClose: this.onClose ?? (() => this.remove()),
        provider: this.provider,
      }),
      this.shadow,
    );
  }
}

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElement;
