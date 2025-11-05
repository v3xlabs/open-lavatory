const labelClasses =
  "font-semibold text-gray-700 text-xs uppercase tracking-wide";
const inputClasses =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

type LabelProps = {
  htmlFor?: string;
  children: string;
};

export const Label = ({ htmlFor, children }: LabelProps) => (
  <label className={labelClasses} htmlFor={htmlFor}>
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
};

export const Input = ({
  // eslint-disable-next-line no-restricted-syntax
  id,
  value,
  placeholder,
  ariaLabel,
  readOnly = true,
}: InputProps) => (
  <input
    // eslint-disable-next-line no-restricted-syntax
    id={id}
    className={inputClasses}
    value={value}
    placeholder={placeholder}
    aria-label={ariaLabel}
    readOnly={readOnly}
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
