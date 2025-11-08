// Button implementation that also supports being an anchor tag
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  createElement,
} from "preact";
import type { FC } from "preact/compat";
import type { VariantProps } from "tailwind-variants/lite";
import { tv } from "tailwind-variants/lite";

const styles = tv({
  base: "flex items-center justify-center rounded-lg transition-colors hover:bg-gray-200",
  variants: {
    variant: {
      primary: "bg-blue-500 text-white",
    },
    size: {
      sm: "",
      md: "h-8",
      lg: "h-11",
    },
    aspect: {
      square: "aspect-square",
      auto: "",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "primary",
    aspect: "auto",
  },
});

export type ButtonButtonProps = {
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonLinkProps = {
  href: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>;
export type ButtonProps = VariantProps<typeof styles> &
  (
    | ({
        href: string;
      } & ButtonLinkProps)
    | ({
        onClick: () => void;
      } & ButtonButtonProps)
  );

export const Button: FC<ButtonProps> = ({
  href,
  onClick,
  children,
  variant,
  size,
  aspect,
  ...props
}) => {
  return createElement(
    href ? "a" : "button",
    {
      href: href ?? undefined,
      onClick,
      className: styles({ variant, size, aspect }),
      ...props,
    },
    children,
  );
};
