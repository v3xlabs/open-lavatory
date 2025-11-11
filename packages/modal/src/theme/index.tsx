import type { FC, PropsWithChildren } from "preact/compat";
import { match } from "ts-pattern";

import { simpleTheme } from "./simple.js";
import { openlvThemeTokens } from "./openlv.js";
import { retroTheme } from "./retro.js";
import type {
  OpenLVTheme,
  ThemeConfig,
  ThemeIdentifier,
  ThemeMode,
  ThemeTokensMap,
} from "./types.js";

const buildThemeVariables = (
  map: Map<string, string>,
  path: string[],
  object: Record<string, string | object>,
) => {
  for (const [key, value] of Object.entries(object)) {
    if (value && typeof value === "object") {
      buildThemeVariables(
        map,
        [...path, key],
        value as Record<string, string | object>,
      );
    } else if (typeof value === "string") {
      map.set(`--lv-${[...path, key].join("-")}`, value);
    }
  }
};

/**
 * Converts the theme to css variables prefixed with --lv-
 * including nested keys using - notation
 */
export const buildTheme = (tokens: OpenLVTheme) => {
  const map = new Map<string, string>();

  if (tokens) {
    buildThemeVariables(map, [], tokens);
  }

  // Provide alias variables between control.button.* and button.* to maintain compatibility
  const alias = (from: string, to: string) => {
    const val = map.get(from);

    if (val !== undefined && !map.has(to)) map.set(to, val);
  };

  const variants = ["primary", "secondary", "tertiary"] as const;
  const props = [
    "background",
    "color",
    "border",
    "hoverBackground",
    "activeBackground",
    "disabledBackground",
    "disabledColor",
  ] as const;

  for (const v of variants) {
    for (const p of props) {
      alias(`--lv-control-button-${v}-${p}`, `--lv-button-${v}-${p}`);
      alias(`--lv-button-${v}-${p}`, `--lv-control-button-${v}-${p}`);
    }
  }

  return Object.fromEntries(map.entries());
};

export type {
  OpenLVTheme,
  ThemeConfig,
  ThemeIdentifier,
  ThemeMode,
  ThemeTokensMap,
};

export type ThemeProviderProps = PropsWithChildren<ThemeConfig>;

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  theme: "openlv",
  mode: "light",
} as const;

const hasVariantKeys = (value: unknown): value is ThemeTokensMap => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "light" in value || "dark" in value || "system" in value;
};

const defaultTokens: Record<ThemeIdentifier, OpenLVTheme | ThemeTokensMap> = {
  openlv: openlvThemeTokens,
  retro: retroTheme,
};

const getDefaultTokens = (theme: ThemeIdentifier) => defaultTokens[theme];

const resolveSystemMode = (): "light" | "dark" => {
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }

  return "light";
};

const resolveFromVariantMap = (
  requestedMode: ThemeMode,
  candidate: ThemeTokensMap,
) => {
  const preferences: ThemeMode[] =
    requestedMode === "system"
      ? [resolveSystemMode(), "light", "dark"]
      : [requestedMode, "light", "dark"];

  for (const preference of preferences) {
    const tokensForMode = candidate[preference as keyof ThemeTokensMap];

    if (tokensForMode) {
      return {
        tokens: tokensForMode,
        mode: preference,
      };
    }
  }

  return undefined;
};

export const resolveTheme = (
  config: ThemeConfig,
): { tokens: OpenLVTheme; mode?: ThemeMode } => {
  const { theme, tokens: customTokens } = config;
  const defaultThemeTokens = getDefaultTokens(theme);

  return match(theme)
    .with("openlv", () => {
      const requestedMode = config.mode ?? "light";
      const candidate = customTokens ?? defaultThemeTokens;

      if (hasVariantKeys(candidate)) {
        const resolved = resolveFromVariantMap(requestedMode, candidate);

        if (resolved) {
          return resolved;
        }
      }

      return { tokens: candidate as OpenLVTheme, mode: requestedMode };
    })
    .with("retro", () => ({
      tokens: (customTokens ?? defaultThemeTokens) as OpenLVTheme,
      mode: undefined,
    }))
    .exhaustive();
};

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
  ...config
}) => {
  const { tokens: selectedTokens, mode: resolvedMode } = resolveTheme(
    config as ThemeConfig,
  );

  return (
    <div
      style={buildTheme(selectedTokens)}
      id="root"
      data-openlv-theme={config.theme}
      data-openlv-mode={resolvedMode}
    >
      {children}
    </div>
  );
};
