import type { FC } from "preact/compat";

import { Select } from "./Select.js";
import { useTranslation } from "../utils/i18n.js";

export type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const Toggle: FC<ToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <Select
      options={[
        ["true", t("common.yes")],
        ["false", t("common.no")],
      ]}
      value={value ? "true" : "false"}
      onChange={(value) => onChange(value === "true")}
    />
  );
};
