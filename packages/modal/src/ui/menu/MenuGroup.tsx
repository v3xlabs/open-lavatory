import type { FC, PropsWithChildren, ReactNode } from "preact/compat";

export type MenuGroupProps = PropsWithChildren<{
  title: string;
  right?: ReactNode;
}>;

export const MenuGroup: FC<MenuGroupProps> = ({ title, right, children }) => (
  <div>
    <div className="flex items-end justify-between px-2 py-1">
      <div className="font-medium text-gray-900 text-sm">{title}</div>
      <div>{right}</div>
    </div>
    <div className="flex flex-col gap-1 rounded-md bg-[#F4F5F6] p-2">
      {children}
    </div>
  </div>
);
