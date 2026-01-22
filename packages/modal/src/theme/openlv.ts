import type { ThemeTokensMap } from "./types.js";

// Predefined theme token variants for light/dark/system
export const openlvTheme = {
  common: {
    font: { family: "Inter, sans-serif" },
    border: { radius: "16px" },
    control: {
      button: {
        primary: {
          padding: "8px 16px",
        },
      },
    },
  },
  light: {
    body: { color: "#0F172A", background: "#FFFFFF" },
    overlay: {
      background: "rgba(0, 0, 0, 0.10)",
      backdrop: { filter: "blur(6px)" },
    },
    modal: { shadow: "0px 12px 32px rgba(15,23,42,0.10)" },
    control: {
      input: { background: "#FFFFFF", border: "#E2E8F0", text: "#0F172A" },
      button: {
        primary: {
          background: "#FF6A00",
          color: "#FFFFFF",
          hoverBackground: "#FF7D1F",
          activeBackground: "#E76200",
          disabledBackground: "#CBD5E1",
          disabledColor: "#475569",
          border: "#FF6A00",
        },
        secondary: {
          background: "#E2E8F0",
          color: "#0F172A",
          hoverBackground: "#CBD5E1",
          activeBackground: "#94A3B8",
          disabledBackground: "#F1F5F9",
          disabledColor: "#94A3B8",
          border: "#E2E8F0",
        },
        tertiary: {
          color: "#475569",
          hoverBackground: "#F1F5F9",
          activeBackground: "#E2E8F0",
          disabledColor: "#94A3B8",
        },
      },
    },
    qr: { background: "#FFFFFF", color: "#0F172A" },
    card: { background: "#F5F5F5" },
    text: { primary: "#0F172A", secondary: "#475569", muted: "#94A3B8" },
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
