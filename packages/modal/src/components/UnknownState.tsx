import { useSession } from "../hooks/useSession.js";

export const UnknownState = (props: { state: unknown; }) => {
  const { uri, status } = useSession();

  // biome-ignore lint/suspicious/noConsole: debug
  console.error("Unknown state:", {
    state: props.state,
  });

  return (
    <div class="rounded-md bg-(--lv-control-button-secondary-background) p-2 text-(--lv-text-muted)">
      <div>
        Unknown state:
        {JSON.stringify(props.state)}
      </div>
      <div>
        URI:
        {uri()}
      </div>
      <div>
        Session Status:
        {JSON.stringify(status())}
      </div>
    </div>
  );
};
