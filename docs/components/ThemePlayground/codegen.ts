import type { ThemeTokensMap } from "@openlv/modal/theme";

import { type BaseThemeName, getBaseTheme } from "./config.js";
import { dedup, deepDiff } from "./utils.js";

type PlainObject = Record<string, unknown>;

const toJS = (obj: unknown, indent: number): string =>
  JSON.stringify(obj, undefined, 2)
    .replaceAll(/"([a-zA-Z_$]\w*)":/g, "$1:")
    .replaceAll("\n", "\n" + " ".repeat(indent));

const toJSWithSpread = (
  diff: PlainObject,
  baseExpr: string,
  indent: number,
): string => {
  const pad = " ".repeat(indent);
  const innerPad = " ".repeat(indent + 2);

  const entries = Object.entries(diff).map(([key, val]) => {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      const nested = toJSWithSpread(
        val as PlainObject,
        `${baseExpr}.${key}`,
        indent + 2,
      );

      return `${innerPad}${key}: ${nested},`;
    }

    const serialized = toJS(val, indent + 2);

    return `${innerPad}${key}: ${serialized},`;
  });

  return `{\n${innerPad}...${baseExpr},\n${entries.join("\n")}\n${pad}}`;
};

export const generateCode = (
  theme: ThemeTokensMap,
  baseName: BaseThemeName,
): string => {
  const connector = "import { openlv } from \"@openlv/connector\";";

  if (baseName === "none") {
    return `${connector}\n\nopenlv({\n  theme: {\n    mode: "auto",\n    theme: ${toJS(dedup(theme as PlainObject), 4)},\n  },\n});`;
  }

  const base = getBaseTheme(baseName) as PlainObject;
  const diff = dedup(deepDiff(theme as PlainObject, base));

  if (Object.keys(diff).length === 0) {
    return `${connector}\n\nopenlv({\n  theme: {\n    mode: "auto",\n    theme: "${baseName}",\n  },\n});`;
  }

  const themeExpr = `${baseName}Theme`;

  return `${connector}\nimport { ${themeExpr} } from "@openlv/modal/theme";\n\nopenlv({\n  theme: {\n    mode: "auto",\n    theme: ${toJSWithSpread(diff, themeExpr, 4)},\n  },\n});`;
};
