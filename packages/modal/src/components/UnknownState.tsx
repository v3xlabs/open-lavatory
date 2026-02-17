import { useProvider } from "../hooks/useProvider.js";
import { useSession } from "../hooks/useSession.js";

export const UnknownState = ({ state }: { state: unknown; }) => {
  const { status: sessionStatus, uri } = useSession();
  const { status: providerStatus } = useProvider();

  // biome-ignore lint/suspicious/noConsole: debug
  console.error("Unknown state:", {
    state,
    sessionStatus: sessionStatus(),
    providerStatus: providerStatus(),
  });

  return (
    <div class="rounded-md bg-(--lv-control-button-secondary-background) p-2 text-(--lv-text-muted)">
      <div>
        Unknown state:
        {JSON.stringify(state)}
      </div>
      <div>
        URI:
        {uri()}
      </div>
      <div>
        Session Status:
        {JSON.stringify(sessionStatus())}
      </div>
      <div>
        Provider Status:
        {JSON.stringify(providerStatus())}
      </div>
    </div>
  );
};
