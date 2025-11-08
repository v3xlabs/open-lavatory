// Button implementation that also supports being an anchor tag
import classNames from "classnames";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  createElement,
} from "preact";
import type { FC, PropsWithChildren } from "preact/compat";
import type { VariantProps } from "tailwind-variants/lite";
import { tv } from "tailwind-variants/lite";

const styles = tv({
  base: "flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 transition-transform",
  variants: {
    $variant: {
      primary: "bg-blue-500 font-semibold text-sm text-white hover:bg-blue-600",
      secondary: "border border-gray-300 text-gray-500 hover:bg-gray-200",
      tertiary: "text-gray-500 hover:text-gray-700 hover:bg-gray-200",
    },
    $size: {
      sm: "h-6",
      md: "h-8",
      lg: "h-11",
    },
    $aspect: {
      square: "aspect-square",
      auto: "",
    },
  },
  defaultVariants: {
    $size: "md",
    $variant: "primary",
    $aspect: "auto",
  },
});

export type ButtonButtonProps = {
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonLinkProps = {
  href: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>;
export type ButtonProps = PropsWithChildren<
  VariantProps<typeof styles> &
  (
    | ({
      href: string;
    } & ButtonLinkProps)
    | ({
      onClick: () => void;
    } & ButtonButtonProps)
  )
>;

export const Button: FC<ButtonProps> = ({
  href,
  onClick,
  children,
  className,
  $variant,
  $size,
  $aspect,
  ...props
}) => {
  return createElement(
    href ? "a" : "button",
    {
      href: href ?? undefined,
      onClick,
      className: classNames(styles({ $variant, $size, $aspect }), className),
      ...props,
    },
    children,
  );
};
