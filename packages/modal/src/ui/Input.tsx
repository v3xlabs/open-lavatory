const labelClasses = "font-semibold text-xs uppercase tracking-wide";
const inputClasses =
  "h-9 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 text-(--lv-control-input-text) bg-(--lv-control-input-background) border-(--lv-control-input-border) focus:border-(--lv-control-button-primary-background) focus:ring-(--lv-control-button-primary-background,rgba(255,106,0,0.2))";

type LabelProps = {
  htmlFor?: string;
  children: string;
};

export const Label = ({ htmlFor, children }: LabelProps) => (
  <label
    className={`${labelClasses} text-(--lv-text-secondary)`}
    htmlFor={htmlFor}
  >
    {children}
  </label>
);

type InputProps = {
  // eslint-disable-next-line no-restricted-syntax
  id?: string;
  value: string;
  placeholder?: string;
  ariaLabel?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

export const Input = ({
  // eslint-disable-next-line no-restricted-syntax
  id,
  value,
  placeholder,
  ariaLabel,
  readOnly = true,
  onChange,
}: InputProps) => (
  <input
    // eslint-disable-next-line no-restricted-syntax
    id={id}
    className={inputClasses}
    value={value}
    placeholder={placeholder}
    aria-label={ariaLabel}
    readOnly={readOnly}
    onChange={(e) => {
      if (e.target instanceof HTMLInputElement) {
        onChange?.(e.target.value);
      }
    }}
    onKeyDown={(e) => {
      e.stopPropagation();
    }}
  />
);

type InputGroupProps = {
  label: string;
  values: readonly string[];
  placeholder?: string;
  inputIdPrefix?: string;
};

export const InputGroup = ({
  label,
  values,
  placeholder,
  inputIdPrefix,
}: InputGroupProps) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    {values.map((value, index) => {
      // eslint-disable-next-line no-restricted-syntax
      const id = inputIdPrefix ? `${inputIdPrefix}-${index}` : undefined;
      const suffix = values.length > 1 ? ` ${index + 1}` : "";

      return (
        <Input
          key={`${label}-${index}`}
          // eslint-disable-next-line no-restricted-syntax
          id={id}
          value={value}
          placeholder={placeholder}
          ariaLabel={`${label}${suffix}`}
        />
      );
    })}
  </div>
);
