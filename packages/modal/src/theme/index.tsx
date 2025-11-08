import { FC, PropsWithChildren } from "preact/compat";

import { simpleTheme } from "./simple";

export type OpenLVTheme = Partial<{
  font: {
    family: string;
  };
  body: {
    color: string;
    background: string;
  };
  border: {
    radius: string;
  };
  overlay: {
    background: string;
    backdrop: {
      filter: string;
    };
  };
  modal: {
    shadow: string;
  };
}>;

const add = (
  map: Map<string, string>,
  prefix: string,
  object: Record<string, string | object>,
) => {
  for (const [key, value] of Object.entries(object)) {
    if (typeof value === "object" && value !== null) {
      add(map, `${prefix}-${key}`, value as Record<string, string | object>);
    } else if (typeof value === "string") {
      map.set(`--lv${prefix}-${key}`, value);
    }
  }
};

/**
 * Converts the theme to css variables prefixed with --lv-
 * including nested keys using - notation
 */
export const buildTheme = (theme: OpenLVTheme, prefix: boolean = true) => {
  const map = new Map<string, string>();

  add(map, "", theme);

  return Object.fromEntries(map.entries());
};

export const ThemeProvider: FC<PropsWithChildren<{ theme: OpenLVTheme }>> = ({
  theme = simpleTheme,
  children,
}) => {
  return (
    <div style={buildTheme(theme)} id="root">
      {children}
    </div>
  );
};
