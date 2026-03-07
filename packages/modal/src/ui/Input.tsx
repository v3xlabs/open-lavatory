import { Index, mergeProps, splitProps } from "solid-js";

const labelClasses = "font-semibold text-xs uppercase tracking-wide";
const inputClasses
  = "h-9 w-full rounded-lg border bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-(--lv-text-primary) bg-(--lv-body-background) border-(--lv-control-input-border)";

type LabelProps = {
  htmlFor?: string;
  children: string;
};

export const Label = (props: LabelProps) => (
  <label
    class={`${labelClasses} text-(--lv-text-secondary)`}
    for={props.htmlFor}
  >
    {props.children}
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

export const Input = (props: InputProps) => {
  const merged = mergeProps({ readOnly: true }, props);
  const [local] = splitProps(merged, [
    "id",
    "value",
    "placeholder",
    "ariaLabel",
    "readOnly",
    "onChange",
  ]);

  return (
    <input
      // eslint-disable-next-line no-restricted-syntax
      id={local.id}
      class={inputClasses}
      value={local.value}
      placeholder={local.placeholder}
      aria-label={local.ariaLabel}
      readOnly={local.readOnly}
      onInput={(e) => {
        local.onChange?.(e.currentTarget.value);
      }}
    />
  );
};

type InputGroupProps = {
  label: string;
  values: readonly string[];
  placeholder?: string;
  inputIdPrefix?: string;
};

export const InputGroup = (props: InputGroupProps) => (
  <div class="grid gap-2">
    <Label>{props.label}</Label>
    <Index each={props.values}>
      {(value, index) => {
        // eslint-disable-next-line no-restricted-syntax
        const id = props.inputIdPrefix
          ? `${props.inputIdPrefix}-${index}`
          : undefined;
        const suffix = props.values.length > 1 ? ` ${index + 1}` : "";

        return (
          <Input
            // eslint-disable-next-line no-restricted-syntax
            id={id}
            value={value()}
            placeholder={props.placeholder}
            ariaLabel={`${props.label}${suffix}`}
          />
        );
      }}
    </Index>
  </div>
);
