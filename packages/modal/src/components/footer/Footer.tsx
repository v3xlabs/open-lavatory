import { OPENLV_ICON_128_WHITE } from "@openlv/core/icons";
import { createMemo } from "solid-js";

import { OPENLV_ICON_128 } from "../../assets/logo.js";
import { useModalContext } from "../../context.js";
import { useSettings } from "../../hooks/useSettings.js";
import { resolveMode } from "../../theme/index.js";
import { FooterStatus } from "./StatusIndicator.js";

export const Footer = () => {
  const { themeConfig } = useModalContext();
  const { settings } = useSettings();
  const logoSrc = createMemo(() =>
    (resolveMode(themeConfig?.mode, settings().theme) === "dark"
      ? OPENLV_ICON_128_WHITE
      : OPENLV_ICON_128),
  );

  return (
    <>
      <div class="h-11 w-full"></div>
      <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 py-2 text-(--lv-text-muted)">
        <a
          href="https://github.com/v3xlabs/open-lavatory"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-2 p-1 font-semibold text-sm text-(--lv-text-muted)"
        >
          <img
            src={logoSrc()}
            alt="Open Lavatory Logo"
            width={20}
            height={20}
            class="rounded"
            data-openlv-brand-logo
          />
          <span>openlv</span>
        </a>
        <div class="text-sm text-(--lv-text-muted)">
          <FooterStatus />
        </div>
      </div>
    </>
  );
};
