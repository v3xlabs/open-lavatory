import type { FC, PropsWithChildren, ReactNode } from "preact/compat";

export type MenuItemProps = PropsWithChildren<{
  label: ReactNode;
}>;

export const MenuItem: FC<MenuItemProps> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-2 px-2 py-1">
    <div className="text-sm text-(--lv-text-secondary) text-start">{label}</div>
    <div>{children}</div>
  </div>
);
