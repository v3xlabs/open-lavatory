import classNames from "classnames";
import type { FC } from "preact/compat";

export type SelectProps = {
  options: string[][];
  value: string;
  onChange: (value: string) => void;
};

export const Select: FC<SelectProps> = ({ options, value, onChange }) => {
  return (
    <div className="flex divide-x overflow-hidden rounded-md border border-gray-300">
      {options.map(([slug, label]) => (
        <button
          key={slug}
          type="button"
          onClick={() => onChange(slug)}
          aria-pressed={slug === value}
          className={classNames(
            "px-4 py-2 font-semibold text-xs transition",
            slug === value
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "cursor-pointer border-gray-300 text-gray-600 hover:border-gray-400",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
