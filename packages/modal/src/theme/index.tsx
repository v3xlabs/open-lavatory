import type { FC, PropsWithChildren } from "preact/compat";

import { openlvTheme } from "./openlv.js";
import { simpleTheme } from "./simple.js";
import type {
  AnyThemeConfig,
  OpenLVTheme,
  ThemeConfig,
  ThemeMode,
  ThemeTokensMap,
  ValidModes,
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
    "selectedBackground",
    "selectedColor",
  ] as const;

  for (const v of variants) {
    for (const p of props) {
      alias(`--lv-control-button-${v}-${p}`, `--lv-button-${v}-${p}`);
      alias(`--lv-button-${v}-${p}`, `--lv-control-button-${v}-${p}`);
    }
  }

  return Object.fromEntries(map.entries());
};

// Export theme objects for direct use
export { openlvTheme, simpleTheme };

export type {
  AnyThemeConfig,
  OpenLVTheme,
  ThemeConfig,
  ThemeMode,
  ThemeTokensMap,
  ValidModes,
};

export type ThemeProviderProps = PropsWithChildren<AnyThemeConfig>;

export const DEFAULT_THEME_CONFIG: ThemeConfig<typeof openlvTheme> = {
  theme: openlvTheme,
  mode: "system",
};

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
  config: AnyThemeConfig,
): { tokens: OpenLVTheme; mode: ThemeMode } => {
  const { theme } = config;

  const resolved = resolveFromVariantMap(config.mode, theme);

  if (!resolved) {
    throw new Error("Invalid theme configuration: mode does not match tokens");
  }

  return resolved;
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
      data-openlv-mode={resolvedMode}
    >
      {children}
    </div>
  );
};
