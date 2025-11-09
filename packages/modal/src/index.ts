/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */
/** biome-ignore-all lint/performance/noReExportAll: package entrypoint */
/** biome-ignore-all lint/suspicious/noConsole: temp */

export type { ModalRootProps } from "./components/ModalRoot";
export { ModalRoot } from "./components/ModalRoot";
export { OpenLVModalElement } from "./element";
export { useConnectionState } from "./hooks/useConnectionState";

import type { OpenLVProvider } from "../../provider/src";
import OpenLVModalElementDefault from "./element";
import { simpleTheme } from "./theme/simple";
import { log } from "./utils/log";
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

export const triggerOpenModal = (
  provider: OpenLVProvider,
  onClose: () => void,
) => {
  const modal = document.querySelector("openlv-modal");

  if (modal) modal.remove();

  if (!modal) {
    registerOpenLVModal();
    const x = new OpenLVModalElementDefault(provider, simpleTheme, () => {
      log("modal closed");
      x.remove();
      onClose();
    });

    document.body.appendChild(x);
    x.showModal();
  }
};

export type TriggerOpenModal = typeof triggerOpenModal;
