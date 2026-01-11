export type ThemeIdentifier = "openlv" | "simple";
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

type HasLight<T extends ThemeTokensMap> = T extends { light: OpenLVTheme }
  ? true
  : false;

type HasDark<T extends ThemeTokensMap> = T extends { dark: OpenLVTheme }
  ? true
  : false;

export type ModesForTokens<T extends ThemeTokensMap> =
  HasLight<T> extends true
    ? HasDark<T> extends true
      ? ThemeMode
      : "light"
    : HasDark<T> extends true
      ? "dark"
      : never;

export type ThemeConfig<T extends ThemeTokensMap = ThemeTokensMap> = {
  theme: ThemeIdentifier;
  /**
   * Optional override tokens for the selected theme.
   * If omitted, defaults will be looked up by `theme`.
   */
  tokens?: T;
  /**
   * Active mode. Must be compatible with the provided/derived tokens.
   */
  mode: ModesForTokens<T>;
};
