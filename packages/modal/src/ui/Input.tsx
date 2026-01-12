const labelClasses = "font-semibold text-xs uppercase tracking-wide";
const inputClasses =
  "h-9 w-full rounded-lg border bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

type LabelProps = {
  htmlFor?: string;
  children: string;
};

export const Label = ({ htmlFor, children }: LabelProps) => (
  <label
    className={labelClasses}
    htmlFor={htmlFor}
    style={{ color: "var(--lv-text-secondary)" }}
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
    style={{
      color: "var(--lv-text-primary)",
      backgroundColor: "var(--lv-body-background)",
      borderColor: "var(--lv-control-input-border)",
    }}
    value={value}
    placeholder={placeholder}
    aria-label={ariaLabel}
    readOnly={readOnly}
    onChange={(e) => {
      if (e.target instanceof HTMLInputElement) {
        onChange?.(e.target.value);
      }
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
