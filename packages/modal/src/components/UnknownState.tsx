import type { FC } from "preact/compat";

import { useProvider } from "../hooks/useProvider.js";
import { useSession } from "../hooks/useSession.js";

export const UnknownState: FC<{ state: unknown }> = ({ state }) => {
  const { status: sessionStatus, uri } = useSession();
  const { status: providerStatus } = useProvider();

  // biome-ignore lint/suspicious/noConsole: debug
  console.error("Unknown state: ", { state, sessionStatus, providerStatus });

  return (
    <div className="rounded-md bg-(--lv-button-secondary-background) p-2 text-(--lv-text-muted)">
      <div>Unknown state: {JSON.stringify(state)}</div>
      <div>URI: {uri}</div>
      <div>Session Status: {JSON.stringify(sessionStatus)}</div>
      <div>Provider Status: {JSON.stringify(providerStatus)}</div>
    </div>
  );
};
