import type { ThemeTokensMap } from "./types.js";

export const simpleThemeTokens = {
  light: {
    font: { family: "sans-serif" },
    body: {
      color: "#1E293B",
      background: "#F5F5F5",
    },
    border: {
      radius: "16px",
    },
    overlay: {
      background: "rgba(0, 0, 0, 0.3)",
      backdrop: { filter: "blur(8px)" },
    },
    modal: {
      shadow: "0px 12px 32px rgba(0, 0, 0, 0.25)",
    },
    control: {
      input: {
        background: "#FFFFFF",
        border: "#E5E7EB",
        text: "#111827",
      },
      button: {
        primary: {
          background: "#3B82F6",
          color: "#FFFFFF",
          padding: "8px 16px",
          hoverBackground: "#2563EB",
          activeBackground: "#1D4ED8",
          disabledBackground: "#E5E7EB",
          disabledColor: "#9CA3AF",
          border: "#3B82F6",
        },
        secondary: {
          background: "#E5E7EB",
          color: "#374151",
          hoverBackground: "#D1D5DB",
          activeBackground: "#D1D5DB",
          disabledBackground: "#F9FAFB",
          disabledColor: "#9CA3AF",
          border: "#D1D5DB",
        },
        tertiary: {
          color: "#6B7280",
          hoverBackground: "#E5E5E5",
          activeBackground: "#D1D5DB",
          disabledColor: "#9CA3AF",
        },
      },
    },
    qr: {
      background: "#F9FAFB",
      color: "#111827",
    },
    text: {
      primary: "#111827",
      secondary: "#374151",
      muted: "#6B7280",
      heading: "#111827",
      body: "#1E293B",
    },
  },
  dark: {},
} satisfies ThemeTokensMap;
