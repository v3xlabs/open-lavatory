import "./index.css";

import { buildTheme, type OpenLVTheme } from "../theme";
// Import CSS as a string using Vite's ?inline query
// @ts-expect-error - Vite handles this import at build time
import cssContent from "./index.css?inline";

export const ensureStyles = async (
  shadowRoot?: ShadowRoot,
  theme?: OpenLVTheme,
) => {
  // If we have a shadow root, inject styles directly into it
  if (shadowRoot) {
    // Check if styles are already injected in this shadow root
    const existingStyle = shadowRoot.querySelector("style[data-openlv-modal]");

    if (existingStyle) {
      return;
    }

    // Create and inject style element into shadow DOM
    const style = document.createElement("style");

    style.setAttribute("data-openlv-modal", "true");

    if (theme) {
      const extendedCss = buildTheme(theme);
      const rootVars = `:root, :host {${Object.entries(extendedCss)
        .map(([key, value]) => `${key}: ${value};`)
        .join("\n")}}`;

      style.textContent = `${rootVars}\n${cssContent}`;
    } else {
      style.textContent = cssContent;
    }

    shadowRoot.appendChild(style);
  }
};
