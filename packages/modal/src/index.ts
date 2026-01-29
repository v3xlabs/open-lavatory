/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */
/** biome-ignore-all lint/performance/noReExportAll: package entrypoint */
/** biome-ignore-all lint/suspicious/noConsole: temp */

export { ModalRoot } from "./components/ModalRoot.js";
export { OpenLVModalElement, type OpenLVModalElementProps } from "./element.js";
export { useConnectionState } from "./hooks/useConnectionState.js";
export type { ThemeConfig } from "./theme/index.js";

import OpenLVModalElementDefault, {
  type OpenLVModalElementProps,
} from "./element.js";
import { log } from "./utils/log.js";
export { OPENLV_ICON_128 } from "./assets/logo.js";

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

export const triggerOpenModal = (props: OpenLVModalElementProps) => {
  const modal = document.querySelector("openlv-modal");

  if (modal) modal.remove();

  if (!modal) {
    registerOpenLVModal();
    const x = new OpenLVModalElementDefault({
      onClose() {
        log("modal closed");
        x.remove();
        props.onClose?.();
      },
      provider: props.provider,
      theme: props.theme,
    });

    document.body.appendChild(x);
    x.showModal();
  }
};

export type TriggerOpenModal = typeof triggerOpenModal;
