import type { OpenLVTheme } from "./index.js";

export const simpleTheme: OpenLVTheme = {
  font: {
    family: "Inter, sans-serif",
  },
  body: {
    color: "#373737",
    background: "#ffffff",
  },
  border: {
    radius: "16px",
  },
  overlay: {
    background: "#00000008",
    backdrop: {
      filter: "blur(2px)",
    },
  },
  modal: {
    shadow: "0px 2px 4px 0px #00000005",
  },
};
