import type { FC, ReactNode } from "preact/compat";
import { LuChevronRight } from "react-icons/lu";

export type MenuLinkProps = {
  label: ReactNode;
  value?: ReactNode;
  onClick: () => void;
};

export const MenuLink: FC<MenuLinkProps> = ({ label, value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full cursor-pointer items-center justify-between gap-2 first:rounded-t-sm last:rounded-b-sm px-2 py-1 hover:bg-(--lv-control-button-tertiary-hoverBackground)"
  >
    <div className="text-sm text-(--lv-text-secondary) flex items-center gap-1">
      {label}
    </div>
    <div className="flex items-center gap-1">
      {value && <span className="text-sm text-(--lv-text-muted)">{value}</span>}
      <LuChevronRight className="h-4 w-4 text-(--lv-text-muted) rtl:rotate-180" />
    </div>
  </button>
);
