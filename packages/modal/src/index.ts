export { ConnectionFlow } from "./components/ConnectionFlow";
export type { ModalRootProps } from "./components/ModalRoot";
export { ModalRoot } from "./components/ModalRoot";
export { useConnectionState } from "./hooks/useConnectionState";
export type { OpenLVModalElementProps } from "./openlv-modal-element";
export { OpenLVModalElement } from "./openlv-modal-element";
export type { ModalPreferences } from "./preferences";
export { getDefaultModalPreferences } from "./preferences";
export type {
  ConnectionInfo,
  ConnectorModalInterface,
  ModalConnectionInterface,
} from "./types/connection";
import OpenLVModalElementDefault from "./openlv-modal-element";
export { OPENLV_ICON_128 } from "./assets/logo";

export const registerOpenLVModal = (tagName = "openlv-modal") => {
  if (typeof window === "undefined") {
    return tagName;
  }

  const registry = window.customElements;

  if (!registry) {
    console.warn(
      "OpenLV modal: custom elements are not supported in this environment.",
    );

    return tagName;
  }

  if (!registry.get(tagName)) {
    registry.define(
      tagName,
      OpenLVModalElementDefault as unknown as CustomElementConstructor,
    );
  }

  return tagName;
};

// eslint-disable-next-line import/no-default-export
export default OpenLVModalElementDefault;

export const triggerOpenModal = () => {
  const modal = document.querySelector('openlv-modal');

  if (!modal) {
    registerOpenLVModal();
    document.body.appendChild(new OpenLVModalElementDefault());
  }

  if (modal instanceof OpenLVModalElementDefault) {
    modal.showModal();
  } else {
    console.warn('OpenLV modal not found');
  }
};