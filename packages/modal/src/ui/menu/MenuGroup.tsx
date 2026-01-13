import type { FC, PropsWithChildren, ReactNode } from "preact/compat";

export type MenuGroupProps = PropsWithChildren<{
  title: string;
  right?: ReactNode;
}>;

export const MenuGroup: FC<MenuGroupProps> = ({ title, right, children }) => (
  <div>
    <div className="flex items-end justify-between py-1 pl-2">
      <div className="font-medium text-(--lv-text-primary) text-sm">
        {title}
      </div>
      <div>{right}</div>
    </div>
    <div className="flex flex-col gap-1 rounded-md bg-(--lv-card-background) p-2">
      {children}
    </div>
  </div>
);
