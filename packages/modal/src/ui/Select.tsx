import classNames from "classnames";
import type { FC } from "preact/compat";

export type SelectProps = {
  options: string[][];
  value: string;
  onChange: (value: string) => void;
};

export const Select: FC<SelectProps> = ({ options, value, onChange }) => {
  const borderColor = "var(--lv-button-secondary-background)";

  return (
    <div
      className="flex overflow-hidden rounded-md border"
      style={{ borderColor }}
    >
      {options.map(([slug, label]) => (
        <button
          key={slug}
          type="button"
          onClick={() => onChange(slug)}
          aria-pressed={slug === value}
          className={classNames(
            "px-4 py-2 font-semibold text-xs transition border-l first:border-l-0",
            slug !== value && "cursor-pointer",
          )}
          style={
            slug === value
              ? {
                  backgroundColor: "var(--lv-button-secondary-background)",
                  color: "var(--lv-text-primary)",
                  borderColor,
                }
              : {
                  color: "var(--lv-text-secondary)",
                  borderColor,
                }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
};
