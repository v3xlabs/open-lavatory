import type { FC, PropsWithChildren } from "preact/compat";
import { LuCircleHelp } from "react-icons/lu";
import type { VariantProps } from "tailwind-variants/lite";
import { tv } from "tailwind-variants/lite";
import { match } from "ts-pattern";

const styles = tv({
  slots: {
    root: "group relative",
    box: "cursor-pointer rounded-md transition-colors hover:bg-neutral-200 flex items-center justify-center",
    popover:
      "-translate-x-1/2 absolute top-full left-1/2 z-10 hidden rounded-md bg-neutral-100 p-2 shadow-sm group-hover:block",
    icon: "",
  },
  variants: {
    size: {
      sm: {
        box: "h-5 w-5 p-1",
        icon: "h-3 w-3",
      },
      md: {
        box: "h-6 w-6 p-1",
        icon: "h-4 w-4",
      },
      lg: {
        box: "h-8 w-8 p-1.5",
        icon: "h-4 w-4",
      },
    },
    variant: {
      icon: "",
      text: "",
    },
  },
  defaultVariants: {
    size: "lg",
  },
});

export type InfoTooltipProps = VariantProps<typeof styles>;

export const InfoTooltip: FC<PropsWithChildren<InfoTooltipProps>> = ({
  variant = "icon",
  children,
  size = "lg",
}) => {
  const { root, box, popover, icon } = styles({ size, variant });

  return (
    <div className={root()}>
      <div className={box()}>
        {match(variant)
          .with("icon", () => <LuCircleHelp className={icon()} />)
          .with("text", () => <div>Text</div>)
          .exhaustive()}
      </div>
      <div className={popover()}>{children}</div>
    </div>
  );
};
