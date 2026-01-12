import classNames from "classnames";
import type { FC } from "preact/compat";

export type SelectProps = {
  options: string[][];
  value: string;
  onChange: (value: string) => void;
};

export const Select: FC<SelectProps> = ({ options, value, onChange }) => {
  return (
    <div className="flex overflow-hidden rounded-md border border-(--lv-button-secondary-border)">
      {options.map(([slug, label]) => (
        <button
          key={slug}
          type="button"
          onClick={() => onChange(slug)}
          aria-pressed={slug === value}
          className={classNames(
            "px-4 py-2 font-semibold text-xs transition border-l first:border-l-0 border-(--lv-button-secondary-border)",
            slug === value
              ? "bg-(--lv-button-secondary-selectedBackground,var(--lv-button-secondary-background)) text-(--lv-button-secondary-selectedColor,var(--lv-text-primary))"
              : "bg-transparent text-(--lv-text-secondary) cursor-pointer",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
