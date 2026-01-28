import { createContext } from "preact";
import type { FC, ReactNode } from "preact/compat";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "preact/hooks";
import { match } from "ts-pattern";

import fallbackEnglish from "../../lang/en.json" with { type: "json" };

export type LanguageTag = "en" | "nl" | "fr" | "es" | "se" | "zh-cn";

export type LanguageInfo = {
  tag: LanguageTag;
  name: string;
  nativeName: string;
};

export const LANGUAGES: LanguageInfo[] = [
  { tag: "en", name: "English", nativeName: "English" },
  { tag: "nl", name: "Dutch", nativeName: "Nederlands" },
  { tag: "es", name: "Spanish", nativeName: "Español" },
  { tag: "se", name: "Swedish", nativeName: "Svenska" },
  { tag: "zh-cn", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { tag: "fr", name: "French", nativeName: "Français" },
];

const SUPPORTED_LANGUAGE_TAGS = LANGUAGES.map((l) => l.tag);

export const detectBrowserLanguage = (): LanguageTag => {
  if (typeof navigator === "undefined") return "en";

  const languages = navigator.languages || [navigator.language];

  for (const browserLang of languages) {
    const lang = browserLang.toLowerCase();

    // Exact match
    if (SUPPORTED_LANGUAGE_TAGS.includes(lang as LanguageTag)) {
      return lang as LanguageTag;
    }

    // Check for zh-cn variants (zh, zh-hans, zh-cn)
    if (
      lang === "zh" ||
      lang.startsWith("zh-hans") ||
      lang.startsWith("zh-cn")
    ) {
      return "zh-cn";
    }

    // Base language match (e.g., "en-US" -> "en")
    const [baseLang] = lang.split("-");

    if (SUPPORTED_LANGUAGE_TAGS.includes(baseLang as LanguageTag)) {
      return baseLang as LanguageTag;
    }
  }

  return "en";
};

export const getLanguageScore = (tag: string): number => {
  if (typeof navigator === "undefined") return 0;

  const languages = navigator.languages || [navigator.language];

  for (let i = 0; i < languages.length; i++) {
    const browserLang = languages[i].toLowerCase();

    // Exact match
    if (browserLang === tag) return languages.length - i + 1;

    // Prefix match (e.g., "en-US" matches "en")
    if (browserLang.startsWith(`${tag}-`) || tag.startsWith(`${browserLang}-`))
      return languages.length - i;

    // Base language match (e.g., "zh" matches "zh-cn")
    const [baseLang] = browserLang.split("-");

    if (baseLang === tag || tag.startsWith(`${baseLang}-`))
      return languages.length - i - 0.5;
  }

  return 0;
};

export type Translate = (
  key: string,
  params?: Readonly<Record<string, string | number>>,
) => string | ReactNode;

export type Translations = Record<string, unknown>;

const resolveNestedValue = (
  source: Translations | null | undefined,
  key: string,
): unknown => {
  if (!source) return undefined;

  const segments = key.split(".").filter(Boolean);

  if (segments.length === 0) return undefined;

  let current: unknown = source;

  for (const segment of segments) {
    if (typeof current !== "object" || current === null) return undefined;

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const interpolate = (
  template: string,
  params?: Readonly<Record<string, string | number>>,
): string => {
  if (!params) return template;

  return template.replace(
    /\{(\w+)\}/g,
    (matchText: string, key: string): string => {
      const value = params[key];

      return value === undefined ? matchText : String(value);
    },
  );
};

export const resolveTranslation = (parameters: {
  primary: Translations | null;
  fallback: Translations;
  key: string;
  params?: Readonly<Record<string, string | number>>;
}): string => {
  const fromPrimary = resolveNestedValue(parameters.primary, parameters.key);

  if (typeof fromPrimary === "string") {
    return interpolate(fromPrimary, parameters.params);
  }

  const fromFallback = resolveNestedValue(parameters.fallback, parameters.key);

  if (typeof fromFallback === "string") {
    return interpolate(fromFallback, parameters.params);
  }

  return parameters.key;
};

export type TranslationContextValue = {
  languageTag: LanguageTag;
  setLanguageTag: (languageTag: LanguageTag) => void;
  isLoadingLanguagePack: boolean;
  t: Translate;
};

export const TranslationContext = createContext<TranslationContextValue | null>(
  null,
);

const loadLanguagePack = async (
  languageTag: LanguageTag,
): Promise<Translations | null> =>
  match(languageTag)
    .with("en", () => Promise.resolve(null))
    .with("nl", async () => import("../../lang/nl.json").then((m) => m.default))
    .with("es", async () => import("../../lang/es.json").then((m) => m.default))
    .with("se", async () => import("../../lang/se.json").then((m) => m.default))
    .with("fr", async () => import("../../lang/fr.json").then((m) => m.default))
    .with("zh-cn", async () =>
      import("../../lang/zh-cn.json").then((m) => m.default),
    )
    .exhaustive();

export type TranslationProviderProps = {
  children: preact.ComponentChildren;
  initialLanguageTag?: LanguageTag;
};

export const TranslationProvider: FC<TranslationProviderProps> = ({
  children,
  initialLanguageTag = "en",
}) => {
  const [languageTag, setLanguageTag] =
    useState<LanguageTag>(initialLanguageTag);
  const [languagePack, setLanguagePack] = useState<Translations | null>(null);
  const [isLoadingLanguagePack, setIsLoadingLanguagePack] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoadingLanguagePack(true);

      try {
        const nextPack = await loadLanguagePack(languageTag);

        if (cancelled) return;

        setLanguagePack(nextPack);
      } finally {
        if (!cancelled) setIsLoadingLanguagePack(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [languageTag]);

  const t: Translate = useCallback(
    (key, params) =>
      resolveTranslation({
        primary: languagePack,
        fallback: fallbackEnglish as unknown as Translations,
        key,
        params,
      })
        .split("\n")
        .map((line, index) => [line, <br key={index} />]),
    [languagePack],
  );

  const contextValue = useMemo<TranslationContextValue>(
    () => ({
      languageTag,
      setLanguageTag,
      isLoadingLanguagePack,
      t,
    }),
    [isLoadingLanguagePack, languageTag, t],
  );

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error("TranslationProvider not found");
  }

  return context;
};
