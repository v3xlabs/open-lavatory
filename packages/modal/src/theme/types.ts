export type ThemeMode = "light" | "dark" | "system";

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
    width?: string;
    color?: string;
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
  // Controls and UI
  control: {
    input: {
      background: string;
      border: string;
      text: string;
    };
    button: {
      primary: {
        background: string;
        color: string;
        padding: string;
        hoverBackground?: string;
        activeBackground?: string;
        disabledBackground?: string;
        disabledColor?: string;
        border?: string;
      };
      secondary: {
        background: string;
        color: string;
        hoverBackground?: string;
        activeBackground?: string;
        disabledBackground?: string;
        disabledColor?: string;
        border?: string;
        selectedBackground?: string;
        selectedColor?: string;
      };
      tertiary?: {
        color: string;
        hoverBackground?: string;
        activeBackground?: string;
        disabledColor?: string;
      };
    };
  };
  qr: {
    background: string;
    color: string;
  };
  card: {
    background: string;
  };
  text: {
    primary?: string;
    secondary?: string;
    muted?: string;
    heading?: string;
    body?: string;
  };
}>;

export type ThemeTokensMap = {
  common?: OpenLVTheme;
  light?: OpenLVTheme;
  dark?: OpenLVTheme;
} & ({ light: OpenLVTheme } | { dark: OpenLVTheme });

// Extract valid modes from a theme object (light and/or dark keys that exist)
type ExtractModes<T extends ThemeTokensMap> = keyof T & ("light" | "dark");

// System mode is only valid if both light and dark exist
type SystemMode<T extends ThemeTokensMap> = T extends {
  light: OpenLVTheme;
  dark: OpenLVTheme;
}
  ? "system"
  : never;

/**
 * Valid modes for a theme - the modes that exist in the theme object,
 * plus "system" if both light and dark are available.
 */
export type ValidModes<T extends ThemeTokensMap> =
  | ExtractModes<T>
  | SystemMode<T>;

/**
 * Theme configuration with type-safe mode selection.
 * The mode is constrained to only the modes available in the theme object.
 */
export type ThemeConfig<T extends ThemeTokensMap = ThemeTokensMap> = {
  /**
   * The theme tokens object (e.g. simpleTheme, openlvTheme, or a custom theme)
   */
  theme: T;
  /**
   * Active mode. Must be compatible with the provided theme tokens.
   * - If theme has only "light": mode can only be "light"
   * - If theme has only "dark": mode can only be "dark"
   * - If theme has both: mode can be "light", "dark", or "system"
   */
  mode: ValidModes<T>;
};

/**
 * A permissive theme config type for internal use where
 * the exact theme type is not known at compile time.
 */
export type AnyThemeConfig = {
  theme: ThemeTokensMap;
  mode: ThemeMode;
};
