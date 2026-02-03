import { useMemo } from "preact/hooks";

import { useSettings } from "../../../hooks/useSettings.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { MenuItem } from "../../../ui/menu/MenuItem.js";
import { Select } from "../../../ui/Select.js";
import {
  getLanguageScore,
  LANGUAGES,
  type LanguageTag,
  useTranslation,
} from "../../../utils/i18n.js";

export const LanguageSettings = () => {
  const { t, languageTag, setLanguageTag } = useTranslation();
  const { settings, updateLanguage } = useSettings();

  const sortedLanguages = useMemo(() => {
    return [...LANGUAGES].sort((a, b) => {
      const scoreA = getLanguageScore(a.tag);
      const scoreB = getLanguageScore(b.tag);

      return scoreB - scoreA;
    });
  }, []);

  const handleLanguageChange = (value: string) => {
    const newLang = value as LanguageTag;

    setLanguageTag(newLang);
    updateLanguage(newLang);
  };

  return (
    <MenuGroup title={t("settings.appearance")}>
      <MenuItem label={t("settings.language")}>
        <Select
          options={sortedLanguages.map((lang) => [lang.tag, lang.nativeName])}
          value={(settings?.language as LanguageTag | undefined) || languageTag}
          onChange={handleLanguageChange}
        />
      </MenuItem>
    </MenuGroup>
  );
};
