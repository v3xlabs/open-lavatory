import { match, P } from "ts-pattern";

import { useProvider } from "../../hooks/useProvider";
import { useSession } from "../../hooks/useSession";

export const FooterStatus = () => {
  const { status: sessionStatus } = useSession();
  const { status: providerStatus } = useProvider();

  const data = match(providerStatus)
    .with("disconnected", () => undefined)
    .with(P.union("connected", "connecting", "error"), () =>
      match(sessionStatus)
        .with({ status: "disconnected" }, () => ({
          icon: "🫲",
          text: "Disconnected",
        }))
        .with({ status: "created" }, () => ({
          icon: "📄",
          text: "Created",
        }))
        .with({ status: "signaling" }, (x) =>
          match(x.signaling)
            .with({ state: "handshake-open" }, () => ({
              icon: "👋",
              text: "Handshake Open",
            }))
            .with({ state: "handshaking" }, () => ({
              icon: "🤝",
              text: "Handshaking",
            }))
            .with({ state: "handshake-closed" }, () => ({
              icon: "🤝",
              text: "Handshake Closed",
            }))
            .with({ state: "xr-encrypted" }, () => ({
              icon: "🔐",
              text: "Encrypted",
            }))
            .with({ state: "connecting" }, () => ({
              icon: "⏳",
              text: "Connecting",
            }))
            .otherwise(() => ({
              icon: "❓",
              text: "Unknown " + x.signaling?.state,
            })),
        )
        .with({ status: "connected" }, () => ({
          icon: "✅",
          text: "Connected",
        }))
        .with({ status: "ready" }, () => ({
          icon: "🚀",
          text: "Ready",
        }))
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
