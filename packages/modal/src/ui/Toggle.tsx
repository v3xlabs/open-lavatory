import type { FC, ReactNode } from "preact/compat";

import { useTranslation } from "../utils/i18n.js";
import { Select } from "./Select.js";

export type ToggleProps = {
  label: ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const Toggle: FC<ToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <Select
      options={[
        ["true", String(t("common.yes"))],
        ["false", String(t("common.no"))],
      ]}
      value={value ? "true" : "false"}
      onChange={value => onChange(value === "true")}
    />
  );
};
