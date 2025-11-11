export type ThemeIdentifier = "openlv" | "retro";
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
  text: {
    primary?: string;
    secondary?: string;
    muted?: string;
    heading?: string;
    body?: string;
  };
}>;

export type ThemeTokensMap = Partial<{
  light: OpenLVTheme;
  dark: OpenLVTheme;
  system: OpenLVTheme;
}>;

export type ThemeConfig =
  | {
      theme: "openlv";
      mode: ThemeMode;
      tokens?: OpenLVTheme | ThemeTokensMap;
    }
  | {
      theme: "retro";
      mode?: undefined;
      tokens?: OpenLVTheme;
    };
