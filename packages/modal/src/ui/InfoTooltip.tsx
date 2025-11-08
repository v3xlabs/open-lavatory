import type { FC, PropsWithChildren } from "preact/compat";
import { LuCircleHelp } from "react-icons/lu";
import type { VariantProps } from "tailwind-variants/lite";
import { tv } from "tailwind-variants/lite";
import { match } from "ts-pattern";

const styles = tv({
  slots: {
    root: "group relative",
    box: "cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-200",
    popover:
      "-translate-x-1/2 absolute top-full left-1/2 z-10 hidden rounded-md bg-neutral-100 p-2 shadow-sm group-hover:block",
  },
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

export type InfoTooltipProps = VariantProps<typeof styles>;

export const InfoTooltip: FC<PropsWithChildren<InfoTooltipProps>> = ({
  variant = "icon",
  children,
  size = "md",
}) => {
  const { root, box, popover } = styles({ size, variant });

  return (
    <div className={root()}>
      <div className="cursor-pointer rounded-md p-1.5 transition-colors hover:bg-neutral-200">
        {match(variant)
          .with("icon", () => <LuCircleHelp className={box()} />)
          .with("text", () => <div>Text</div>)
          .exhaustive()}
      </div>
      <div className={popover()}>{children}</div>
    </div>
  );
};
