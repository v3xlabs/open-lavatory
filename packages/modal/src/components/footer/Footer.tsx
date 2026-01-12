import { OPENLV_ICON_128 } from "../../assets/logo.js";
import { FooterStatus } from "./StatusIndicator.js";

export const Footer = () => {
  const muted = "var(--lv-text-muted)";

  return (
    <>
      <div className="h-11 w-full"></div>
      <div
        className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 py-2"
        style={{ color: muted }}
      >
        <a
          href="https://github.com/v3xlabs/open-lavatory"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 p-1 font-semibold text-sm"
          style={{ color: muted }}
        >
          <img
            src={OPENLV_ICON_128}
            alt="Open Lavatory Logo"
            width={20}
            height={20}
            className="rounded"
            data-openlv-brand-logo
          />
          <span>openlv</span>
        </a>
        <div className="text-sm" style={{ color: muted }}>
          <FooterStatus />
        </div>
      </div>
    </>
  );
};
