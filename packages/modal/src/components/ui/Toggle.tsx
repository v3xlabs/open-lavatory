import { FC } from "preact/compat";

import { Select } from "./Select";

export type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const Toggle: FC<ToggleProps> = ({ label, value, onChange }) => {
  return (
    <Select
      options={[
        ["true", "Yes"],
        ["false", "No"],
      ]}
      value={value ? "true" : "false"}
      onChange={(value) => onChange(value === "true")}
    />
  );
};
