import { createMemo, Show } from "solid-js";
import { match } from "ts-pattern";

import { useSession } from "../../hooks/useSession.js";
import { useTranslation } from "../../utils/i18n.js";

export const FooterStatus = () => {
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const status = createMemo(() => {
    const sessionState = sessionStatus()?.status;
    const signalState = sessionStatus()?.signaling?.state as string | undefined;

    return match({ sessionState, signalState })
      .with({ sessionState: "connected" }, () => ({
        icon: "✅",
        text: t("status.connectedSuccessfully"),
      }))
      .with({ sessionState: "signaling", signalState: "standby" }, () => ({
        icon: "🫥",
        text: t("status.connecting"),
      }))
      .with({ sessionState: "signaling", signalState: "connecting" }, () => ({
        icon: "↗️",
        text: t("status.connecting"),
      }))
      .with({ sessionState: "signaling", signalState: "ready" }, () => ({
        icon: "👋",
        text: t("status.ready"),
      }))
      .with({ sessionState: "signaling", signalState: "handshake" }, () => ({
        icon: "🤝",
        text: t("status.handshakeClosed"),
      }))
      .with(
        { sessionState: "signaling", signalState: "handshake-partial" },
        () => ({
          icon: "🤝",
          text: t("status.handshakePartial"),
        }),
      )
      .with({ sessionState: "signaling", signalState: "encrypted" }, () => ({
        icon: "🔒",
        text: t("status.encrypted"),
      }))
      .with({ sessionState: "signaling", signalState: "error" }, () => ({
        icon: "❌",
        text: t("status.signalError"),
      }))
      .otherwise(() => undefined);
  });

  return (
    <Show when={status()}>
      {resolved => (
        <div class="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-(--lv-control-button-secondary-background)">
          <div class="pointer-events-none whitespace-nowrap rounded-md text-xs opacity-0 group-hover:opacity-100">
            {resolved().text}
          </div>
          <div>{resolved().icon}</div>
        </div>
      )}
    </Show>
  );
};
