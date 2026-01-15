export type ThemeMode = "light" | "dark" | "system";

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

type OpenLVThemeShape = {
  font: {
    family: string;
  };
  body: {
    color: string;
    /** Background color of the main modal */
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
};

// Theme with all properties deeply optional
export type OpenLVTheme = DeepPartial<OpenLVThemeShape>;

export type ThemeTokensMap = {
  common?: OpenLVTheme;
  light?: OpenLVTheme;
  dark?: OpenLVTheme;
} & ({ light: OpenLVTheme } | { dark: OpenLVTheme });

export type PredefinedThemeName = "simple" | "openlv";
export type ThemeConfig<T extends ThemeTokensMap = ThemeTokensMap> = {
  theme: T | PredefinedThemeName;
  mode: ThemeMode;
};
