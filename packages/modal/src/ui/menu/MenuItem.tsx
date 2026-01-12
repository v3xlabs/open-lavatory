import type { FC, PropsWithChildren } from "preact/compat";

export type MenuItemProps = PropsWithChildren<{
  label: string;
}>;

export const MenuItem: FC<MenuItemProps> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-2">
    <div className="text-sm" style={{ color: "var(--lv-text-secondary)" }}>
      {label}
    </div>
    <div>{children}</div>
  </div>
);
