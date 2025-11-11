import { PROVIDER_STATUS } from "@openlv/provider";
import { SESSION_STATE } from "@openlv/session";
import { SIGNAL_STATE } from "@openlv/signaling";
import { match, P } from "ts-pattern";

import { useProvider } from "../../hooks/useProvider.js";
import { useSession } from "../../hooks/useSession.js";

export const FooterStatus = () => {
  const { status: sessionStatus } = useSession();
  const { status: providerStatus } = useProvider();

  const data = match(providerStatus)
    .with(PROVIDER_STATUS.STANDBY, () => undefined)
    .with(
      P.union(
        PROVIDER_STATUS.CREATING,
        PROVIDER_STATUS.CONNECTING,
        PROVIDER_STATUS.CONNECTED,
        PROVIDER_STATUS.ERROR,
      ),
      () =>
        match({ status: sessionStatus?.status })
          // .with({ status: "disconnected" }, () => ({
          //   icon: "🫲",
          //   text: "Disconnected",
          // }))
          .with({ status: SESSION_STATE.CREATED }, () => undefined)
          .with({ status: SESSION_STATE.CONNECTED }, () => ({
            icon: "✅",
            text: "Connected Successfully!",
          }))
          .with({ status: SESSION_STATE.SIGNALING }, () =>
            match({ status: sessionStatus?.signaling?.state })
              .with({ status: SIGNAL_STATE.STANDBY }, () => ({
                icon: "🫥",
                text: "Connecting",
              }))
              .with({ status: SIGNAL_STATE.CONNECTING }, () => ({
                icon: "↗️",
                text: "Connecting",
              }))
              .with({ status: SIGNAL_STATE.READY }, () => ({
                icon: "👋",
                text: "Ready",
              }))
              .with({ status: SIGNAL_STATE.HANDSHAKE }, () => ({
                icon: "🤝",
                text: "Handshake Closed",
              }))
              .with({ status: SIGNAL_STATE.HANDSHAKE_PARTIAL }, () => ({
                icon: "🤝",
                text: "Handshake Partial",
              }))
              .with({ status: SIGNAL_STATE.ENCRYPTED }, () => ({
                icon: "🔒",
                text: "Encrypted",
              }))
              .with({ status: SIGNAL_STATE.ERROR }, () => ({
                icon: "❌",
                text: "Signal Error",
              }))
              .otherwise(() => ({
                icon: "❓",
                text: "Unknown " + sessionStatus?.signaling?.state,
              })),
          )
          .otherwise((status) => ({
            icon: "❓",
            text: "Unknown " + JSON.stringify(status),
          })),
    )
    .otherwise(() => ({
      icon: "❓",
      text: "Unknown provider status " + JSON.stringify(providerStatus),
    }));

  if (!data) return <></>;

  return (
    <div
      className="group relative flex items-center gap-2 rounded-md px-2 py-2"
      style={{ backgroundColor: "transparent" }}
    >
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs shadow-sm group-hover:block"
        style={{
          backgroundColor: "var(--lv-body-background)",
          color: "var(--lv-text-primary)",
          border: "1px solid var(--lv-button-secondary-background)",
        }}
      >
        {data.text}
      </div>
      <div>{data.icon}</div>
    </div>
  );
};
