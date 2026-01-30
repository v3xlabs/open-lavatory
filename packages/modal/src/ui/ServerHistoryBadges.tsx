import { tv } from "tailwind-variants/lite";

const badgeStyles = tv({
  base: "inline-flex items-center rounded-md px-2 py-0.5 text-xs transition-all duration-100 cursor-pointer active:scale-95 border bg-(--lv-control-button-secondary-background) text-(--lv-control-button-secondary-color) border-(--lv-control-button-secondary-border,var(--lv-control-button-secondary-background)) hover:bg-(--lv-control-button-secondary-hoverBackground,var(--lv-control-button-secondary-background)) active:bg-(--lv-control-button-secondary-activeBackground,var(--lv-control-button-secondary-hoverBackground,var(--lv-control-button-secondary-background))) max-w-[200px] truncate",
});

export type ServerHistoryBadgesProps = {
  history: string[];
  currentServer: string;
  onSelect: (url: string) => void;
};

export const ServerHistoryBadges = ({
  history,
  currentServer,
  onSelect,
}: ServerHistoryBadgesProps) => {
  const filtered = history.filter((url) => url !== currentServer);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {filtered.map((url) => (
        <button
          key={url}
          type="button"
          className={badgeStyles()}
          onClick={() => onSelect(url)}
          title={url}
        >
          {new URL(url).host || url}
        </button>
      ))}
    </div>
  );
};
