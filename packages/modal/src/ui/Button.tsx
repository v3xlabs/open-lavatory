// Button implementation that also supports being an anchor tag
import { cva, VariantProps } from "cva";
import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  createElement,
} from "preact";
import type { FC } from "preact/compat";

const styles = cva({
  base: "",
  variants: {
    variant: {
      primary: "",
      secondary: "",
      tertiary: "",
      ghost: "",
      link: "",
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
    variant: "primary",
    size: "md",
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
