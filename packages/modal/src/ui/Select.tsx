import type { FC } from "preact/compat";
import { tv } from "tailwind-variants/lite";

const styles = tv({
  slots: {
    root: "",
    box: "px-4 py-2 font-semibold text-xs transition border-l first:border-l-0 border-(--lv-button-secondary-border)",
  },
  variants: {
    active: {
      on: {
        box: "bg-(--lv-button-secondary-selectedBackground,var(--lv-button-secondary-background)) text-(--lv-button-secondary-selectedColor,var(--lv-text-primary))",
      },
      off: {
        box: "bg-transparent text-(--lv-text-secondary) cursor-pointer",
      },
    },
  },
  defaultVariants: {
    active: "off",
  },
});

export type SelectProps = {
  options: string[][];
  value: string;
  onChange: (value: string) => void;
};

export const Select: FC<SelectProps> = ({ options, value, onChange }) => {
  const { root, box } = styles({});

  return (
    <div className={root()}>
      {options.map(([slug, label]) => (
        <button
          key={slug}
          type="button"
          onClick={() => onChange(slug)}
          aria-pressed={slug === value}
          className={box({ active: slug === value ? "on" : "off" })}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
