// Button implementation that also supports being an anchor tag
import classNames from "classnames";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  createElement,
} from "preact";
import type { PropsWithChildren } from "preact/compat";
import { tv, type VariantProps } from "tailwind-variants/lite";

const styles = tv({
  base: "lv-button flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 transition-transform",
  variants: {
    $variant: {
      primary:
        "font-semibold text-sm bg-(--lv-button-primary-background) text-(--lv-button-primary-color) border-(--lv-button-primary-border) hover:bg-(--lv-button-primary-hoverBackground,var(--lv-button-primary-background)) active:bg-(--lv-button-primary-activeBackground,var(--lv-button-primary-hoverBackground,var(--lv-button-primary-background))) disabled:bg-(--lv-button-primary-disabledBackground,var(--lv-button-primary-background)) disabled:text-(--lv-button-primary-disabledColor,var(--lv-button-primary-color))",
      secondary:
        "border bg-(--lv-button-secondary-background) text-(--lv-button-secondary-color) border-(--lv-button-secondary-border,var(--lv-button-secondary-background)) hover:bg-(--lv-button-secondary-hoverBackground,var(--lv-button-secondary-background)) active:bg-(--lv-button-secondary-activeBackground,var(--lv-button-secondary-hoverBackground,var(--lv-button-secondary-background))) disabled:bg-(--lv-button-secondary-disabledBackground,var(--lv-button-secondary-background)) disabled:text-(--lv-button-secondary-disabledColor,var(--lv-button-secondary-color))",
      tertiary:
        "bg-transparent text-(--lv-text-muted) hover:bg-(--lv-control-button-tertiary-hoverBackground,transparent) active:bg-(--lv-control-button-tertiary-activeBackground,var(--lv-control-button-tertiary-hoverBackground,transparent)) disabled:text-(--lv-control-button-tertiary-disabledColor,var(--lv-text-muted))",
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

export function Button(rawProps: ButtonProps) {
  const { children, className, $variant, $size, $aspect, ...props } = rawProps;
  const { href, onClick } = rawProps as {
    href?: string;
    onClick?: () => void;
  };

  if (href) {
    const anchorProps = {
      href,
      onClick,
      className: classNames(styles({ $variant, $size, $aspect }), className),
      ...props,
    } as unknown as Record<string, unknown>;

    return createElement("a", anchorProps, children);
  }

  const buttonProps = {
    onClick,
    className: classNames(styles({ $variant, $size, $aspect }), className),
    ...props,
  } as unknown as Record<string, unknown>;

  return createElement("button", buttonProps, children);
}
