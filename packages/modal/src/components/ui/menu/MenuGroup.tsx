import type { FC, PropsWithChildren, ReactNode } from "preact/compat";

export type MenuGroupProps = PropsWithChildren<{
  title: string;
  right?: ReactNode;
}>;

export const MenuGroup: FC<MenuGroupProps> = ({ title, right, children }) => {
  //

  return (
    <div>
      <div className="flex items-end justify-between p-2">
        <div>{title}</div>
        <div>{right}</div>
      </div>
      <div className="flex flex-col gap-1 rounded-md bg-[#F4F5F6] p-2">
        {children}
      </div>
    </div>
  );
};
