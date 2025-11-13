/** biome-ignore-all lint/performance/noBarrelFile: package entrypoint */
/** biome-ignore-all lint/performance/noReExportAll: package entrypoint */
/** biome-ignore-all lint/suspicious/noConsole: temp */

export type { ModalRootProps } from "./components/ModalRoot.js";
export { ModalRoot } from "./components/ModalRoot.js";
export { OpenLVModalElement } from "./element.js";
export { useConnectionState } from "./hooks/useConnectionState.js";
export type {
  OpenLVTheme,
  ThemeConfig,
  ThemeIdentifier,
  ThemeMode,
  ThemeTokensMap,
} from "./theme/index.js";
export {
  buildTheme,
  DEFAULT_THEME_CONFIG,
  resolveTheme,
} from "./theme/index.js";

import type { OpenLVProvider } from "@openlv/provider";

import OpenLVModalElementDefault from "./element.js";
import { DEFAULT_THEME_CONFIG, type ThemeConfig } from "./theme/index.js";
import { openlvThemeTokens } from "./theme/openlv.js";
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

export const triggerOpenModal = (
  provider: OpenLVProvider,
  theme: ThemeConfig = DEFAULT_THEME_CONFIG,
  onClose?: () => void,
) => {
  const modal = document.querySelector("openlv-modal");

  if (modal) modal.remove();

  if (!modal) {
    registerOpenLVModal();
    const x = new OpenLVModalElementDefault(provider, theme, () => {
      log("modal closed");
      x.remove();
      onClose?.();
    });

    document.body.appendChild(x);
    x.showModal();
  }
};

export type TriggerOpenModal = typeof triggerOpenModal;

export { openlvThemeTokens };
