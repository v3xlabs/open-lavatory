import type { ConnectorStorage } from "@openlv/core";
import type { OpenLVProvider } from "@openlv/provider";
import { h, render } from "preact";

import { ModalProvider, type ModalProviderProps } from "./hooks/useProvider";
import { ensureStyles } from "./styles";
import type { ModalConnectionInterface } from "./types/connection";

export class OpenLVModalElement
  extends HTMLElement
  implements ModalConnectionInterface
{
  public onClose?: () => void;
  public provider: OpenLVProvider;
  public storage: ConnectorStorage;

  private readonly shadow: ShadowRoot;
  private renderRequested = false;

  constructor(_provider: OpenLVProvider, _storage: ConnectorStorage) {
    super();
    this.provider = _provider;
    this.storage = _storage;
    this.shadow = this.attachShadow({ mode: "open" });
    ensureStyles(this.shadow);
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
    const props: ModalProviderProps = {
      onClose: this.onClose ?? (() => this.remove()),
      provider: this.provider,
      storage: this.storage,
    };

    render(h(ModalProvider, props), this.shadow);
  }
}

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElement;
