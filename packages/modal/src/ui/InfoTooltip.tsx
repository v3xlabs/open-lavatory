import { cva } from "cva";
import type { FC, PropsWithChildren } from "preact/compat";
import { LuCircleHelp } from "react-icons/lu";
import { match } from "ts-pattern";

const styles = cva({
  base: "",
  variants: {
    size: {
      md: "h-5 w-5",
      lg: "h-6 w-6",
    },
    variant: {
      icon: "",
      text: "",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type InfoTooltipVariant = "icon" | "text";
export type InfoTooltipProps = {
  variant: InfoTooltipVariant;
  size: "md" | "lg";
};

export const InfoTooltip: FC<PropsWithChildren<InfoTooltipProps>> = ({
  variant,
  children,
  size = "md",
}) => (
  <div className="group relative">
    <div className="cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-200">
      {match(variant)
        .with("icon", () => <LuCircleHelp className={styles({ size })} />)
        .with("text", () => <div>Text</div>)
        .exhaustive()}
    </div>
    <div className="-translate-x-1/2 absolute top-full left-1/2 z-10 hidden rounded-md bg-neutral-100 p-2 shadow-sm group-hover:block">
      {children}
    </div>
  </div>
);
