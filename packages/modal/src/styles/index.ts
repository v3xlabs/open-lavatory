import "./index.css";

import {
  buildTheme,
  DEFAULT_THEME_CONFIG,
  resolveTheme,
  type ThemeConfig,
} from "../theme/index.js";
// @ts-expect-error - Vite handles this import at build time
import cssContent from "./index.css?inline";

export const ensureStyles = async (
  shadowRoot?: ShadowRoot,
  theme?: ThemeConfig,
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

    const { tokens } = resolveTheme(
      theme ?? (DEFAULT_THEME_CONFIG as ThemeConfig),
    );
    const vars = buildTheme(tokens);
    const rootVars = `:root, :host {\n${Object.entries(vars)
      .map(([key, value]) => `${key}: ${value};`)
      .join("\n")}\n}`;

    style.textContent = `${rootVars}\n${cssContent}`;

    shadowRoot.appendChild(style);
  }
};
