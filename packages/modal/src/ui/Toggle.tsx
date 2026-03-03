import type { JSX } from "solid-js";

import { useTranslation } from "../utils/i18n.js";
import { Select } from "./Select.js";

export type ToggleProps = {
  label: JSX.Element;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const Toggle = (props: ToggleProps) => {
  const { t } = useTranslation();

  return (
    <Select
      options={[
        ["true", String(t("common.yes"))],
        ["false", String(t("common.no"))],
      ]}
      value={props.value ? "true" : "false"}
      onChange={value => props.onChange(value === "true")}
    />
  );
};
