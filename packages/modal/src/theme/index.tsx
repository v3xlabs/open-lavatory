// import type { FC, PropsWithChildren } from "preact/compat";

import type { ThemeConfig, ThemeTokensMap } from "./types.js";

const importOrPassthrough = async (
  theme: ThemeConfig["theme"],
): Promise<ThemeTokensMap> => {
  if (typeof theme === "string") {
    if (theme === "simple") {
      return await import("./simple.js").then((m) => m.simpleTheme);
    } else if (theme === "openlv") {
      return await import("./openlv.js").then((m) => m.openlvTheme);
    } else {
      throw new Error(`Unknown theme: ${theme}`);
    }
  }

  return theme;
};

type Primitive = string | number | boolean | null | undefined;
type Leaf = Primitive; // extend if you want to allow Date, bigint, etc.

type FlatCssVars = Record<`--${string}`, Leaf>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const flattenToCssVars = <T extends Record<string, unknown>>(
  obj: T,
  prefix: readonly string[] = [],
  out: FlatCssVars = {},
): FlatCssVars => {
  for (const [key, value] of Object.entries(obj)) {
    const path = [...prefix, key];

    if (isPlainObject(value)) {
      flattenToCssVars(value, path, out);
    } else {
      out[`--lv-${path.join("-")}` as `--${string}`] = value as Leaf;
    }
  }

  return out;
};

// Converts the theme into css variables
// --lv-
export const buildTheme = async (config: ThemeConfig) => {
  const theme = await importOrPassthrough(config.theme);

  console.log("theme", theme);
  const variant = theme[config.mode];

  console.log("variant", variant);

  if (!variant) return "";

  const flattened = flattenToCssVars(variant);

  return Object.entries(flattened)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
};
