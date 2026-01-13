import "./index.css";

import { buildTheme } from "../theme/index.js";
import type { ThemeConfig } from "../theme/types.js";
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

    let content = cssContent;

    console.log("theme", theme);

    if (theme) {
      console.log("building theme");
      const themeStr = await buildTheme(theme);
      const rootVars = `:root, :host {\n${themeStr}\n}\n`;

      content = rootVars + content;
    }

    style.textContent = content;

    shadowRoot.appendChild(style);
  }
};
