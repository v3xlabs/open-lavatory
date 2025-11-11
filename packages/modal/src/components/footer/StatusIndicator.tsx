import { match } from "ts-pattern";

import { PROVIDER_STATUS } from "../../constants/providerStatus.js";
import { useProvider } from "../../hooks/useProvider.js";
import { useSession } from "../../hooks/useSession.js";

export const FooterStatus = () => {
  const { status: sessionStatus } = useSession();
  const { status: providerStatus } = useProvider();

  if ((providerStatus as unknown as string) === PROVIDER_STATUS.DISCONNECTED)
    return <></>;

  const sessionState = sessionStatus?.status;
  const signalState = sessionStatus?.signaling?.state as string | undefined;

  const status = match({ sessionState, signalState })
    .with({ sessionState: "connected" }, () => ({
      icon: "✅",
      text: "Connected Successfully!",
    }))
    .with({ sessionState: "signaling", signalState: "standby" }, () => ({
      icon: "🫥",
      text: "Connecting",
    }))
    .with({ sessionState: "signaling", signalState: "connecting" }, () => ({
      icon: "↗️",
      text: "Connecting",
    }))
    .with({ sessionState: "signaling", signalState: "ready" }, () => ({
      icon: "👋",
      text: "Ready",
    }))
    .with({ sessionState: "signaling", signalState: "handshake" }, () => ({
      icon: "🤝",
      text: "Handshake Closed",
    }))
    .with(
      { sessionState: "signaling", signalState: "handshake-partial" },
      () => ({
        icon: "🤝",
        text: "Handshake Partial",
      }),
    )
    .with({ sessionState: "signaling", signalState: "encrypted" }, () => ({
      icon: "🔒",
      text: "Encrypted",
    }))
    .with({ sessionState: "signaling", signalState: "error" }, () => ({
      icon: "❌",
      text: "Signal Error",
    }))
    .otherwise(() => undefined);

  if (!status) return <></>;

  const { icon, text } = status;

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
        {text}
      </div>
      <div>{icon}</div>
    </div>
  );
};
