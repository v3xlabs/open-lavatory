import type { FC, PropsWithChildren, ReactNode } from "preact/compat";

export type MenuGroupProps = PropsWithChildren<{
  title: string;
  right?: ReactNode;
}>;

export const MenuGroup: FC<MenuGroupProps> = ({ title, right, children }) => (
  <div>
    <div className="flex items-end justify-between pl-2 py-1">
      <div
        className="font-medium text-sm"
        style={{ color: "var(--lv-text-primary)" }}
      >
        {title}
      </div>
      <div>{right}</div>
    </div>
    <div
      className="flex flex-col gap-1 rounded-md p-2 border"
      style={{
        backgroundColor: "transparent",
        borderColor: "var(--lv-button-secondary-background)",
      }}
    >
      {children}
    </div>
  </div>
);
