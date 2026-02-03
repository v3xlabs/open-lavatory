import type { ThemeTokensMap } from "./types.js";

export const simpleTheme = {
  light: {
    font: { family: "sans-serif" },
    body: {
      color: "#1E293B",
      background: "#FFFFFF",
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
        border: "#D1D5DC",
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
          hoverBackground: "#D1D5DC",
          activeBackground: "#D1D5DB",
          disabledBackground: "#F9FAFB",
          disabledColor: "#9CA3AF",
          border: "#D1D5DC",
          selectedBackground: "#EFF6FF",
          selectedColor: "#155dfc",
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
    card: {
      background: "#F5F5F5",
    },
    text: {
      primary: "#111827",
      secondary: "#374151",
      muted: "#6B7280",
      heading: "#111827",
      body: "#6a7282",
    },
  },
  dark: {
    body: { color: "#F3F4F6", background: "#16181D" },
    border: { color: "#2F343C", width: "1px" },
    overlay: {
      background: "rgba(0,0,0,0.55)",
      backdrop: { filter: "blur(8px)" },
    },
    modal: { shadow: "0px 22px 60px rgba(0,0,0,0.55)" },
    control: {
      input: { background: "#12151A", border: "#2F343C", text: "#E8EAED" },
      button: {
        primary: {
          background: "#FF6A00",
          color: "#0D0E12",
          hoverBackground: "#FF7D1F",
          activeBackground: "#E76200",
          disabledBackground: "#2A2F36",
          disabledColor: "#8E949C",
          border: "#FF6A00",
        },
        secondary: {
          background: "#262A31",
          color: "#E8EAED",
          hoverBackground: "#2D323A",
          activeBackground: "#23272E",
          disabledBackground: "#1D2026",
          disabledColor: "#8E949C",
          border: "#333843",
        },
        tertiary: {
          color: "#A4A9B1",
          hoverBackground: "#20242A",
          activeBackground: "#1B1F24",
          disabledColor: "#6F747B",
        },
      },
    },
    qr: { background: "#FFFFFF", color: "#0D0E12" },
    card: { background: "#1E2127" },
    text: { primary: "#F3F4F6", secondary: "#C8CCD2", muted: "#9AA0A9" },
  },
} satisfies ThemeTokensMap;
