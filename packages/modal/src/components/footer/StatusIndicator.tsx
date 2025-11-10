import { PROVIDER_STATUS } from "@openlv/provider";
import { SESSION_STATE } from "@openlv/session";
import { SIGNAL_STATE } from "@openlv/signaling";
import { match, P } from "ts-pattern";

import { useProvider } from "../../hooks/useProvider";
import { useSession } from "../../hooks/useSession";

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
    <div className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-neutral-200">
      <div className="text-gray-900 text-xs opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {data.text}
      </div>
      <div>{data.icon}</div>
    </div>
  );
};
