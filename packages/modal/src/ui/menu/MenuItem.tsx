import type { FC, PropsWithChildren } from "preact/compat";

export type MenuItemProps = PropsWithChildren<{
  label: string;
}>;

export const MenuItem: FC<MenuItemProps> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-2">
    <div className="pl-1 text-sm">{label}</div>
    <div>{children}</div>
  </div>
);
