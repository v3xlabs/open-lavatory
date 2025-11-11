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
  base: "lv-button flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 transition-transform bg-[var(--lv-button-bg)] text-[var(--lv-button-color)] hover:bg-[var(--lv-button-hover-bg)] active:bg-[var(--lv-button-active-bg)] disabled:bg-[var(--lv-button-disabled-bg)] disabled:text-[var(--lv-button-disabled-color)] border-[var(--lv-button-border)]",
  variants: {
    $variant: {
      primary: "font-semibold text-sm",
      secondary: "border",
      tertiary: "",
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
  const styleVars: Record<string, string> = {};

  if ($variant === "primary") {
    Object.assign(styleVars, {
      "--lv-button-bg": "var(--lv-button-primary-background)",
      "--lv-button-color": "var(--lv-button-primary-color)",
      "--lv-button-border": "var(--lv-button-primary-border)",
      "--lv-button-hover-bg":
        "var(--lv-button-primary-hoverBackground, var(--lv-button-primary-background))",
      "--lv-button-active-bg":
        "var(--lv-button-primary-activeBackground, var(--lv-button-primary-hoverBackground, var(--lv-button-primary-background)))",
      "--lv-button-disabled-bg":
        "var(--lv-button-primary-disabledBackground, var(--lv-button-primary-background))",
      "--lv-button-disabled-color":
        "var(--lv-button-primary-disabledColor, var(--lv-button-primary-color))",
    });
  } else if ($variant === "secondary") {
    Object.assign(styleVars, {
      "--lv-button-bg": "var(--lv-button-secondary-background)",
      "--lv-button-color": "var(--lv-button-secondary-color)",
      "--lv-button-border":
        "var(--lv-button-secondary-border, var(--lv-button-secondary-background))",
      "--lv-button-hover-bg":
        "var(--lv-button-secondary-hoverBackground, var(--lv-button-secondary-background))",
      "--lv-button-active-bg":
        "var(--lv-button-secondary-activeBackground, var(--lv-button-secondary-hoverBackground, var(--lv-button-secondary-background)))",
      "--lv-button-disabled-bg":
        "var(--lv-button-secondary-disabledBackground, var(--lv-button-secondary-background))",
      "--lv-button-disabled-color":
        "var(--lv-button-secondary-disabledColor, var(--lv-button-secondary-color))",
    });
  } else {
    Object.assign(styleVars, {
      "--lv-button-bg": "transparent",
      "--lv-button-color": "var(--lv-text-muted)",
      "--lv-button-hover-bg":
        "var(--lv-control-button-tertiary-hoverBackground, transparent)",
      "--lv-button-active-bg":
        "var(--lv-control-button-tertiary-activeBackground, var(--lv-control-button-tertiary-hoverBackground, transparent))",
      "--lv-button-disabled-color":
        "var(--lv-control-button-tertiary-disabledColor, var(--lv-text-muted))",
    });
  }

  if (href) {
    const anchorProps = {
      href,
      onClick,
      className: classNames(styles({ $variant, $size, $aspect }), className),
      style: styleVars as unknown as Record<string, string>,
      ...props,
    } as unknown as Record<string, unknown>;

    return createElement("a", anchorProps, children);
  }

  const buttonProps = {
    onClick,
    className: classNames(styles({ $variant, $size, $aspect }), className),
    style: styleVars as unknown as Record<string, string>,
    ...props,
  } as unknown as Record<string, unknown>;

  return createElement("button", buttonProps, children);
}
