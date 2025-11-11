import type { OpenLVTheme } from "./types";

export const retroTheme: OpenLVTheme = {
  font: {
    family: "Courier New, monospace",
  },
  body: {
    color: "#2d1b3d",
    background: "#ff0000",
  },
  border: {
    radius: "8px",
  },
  overlay: {
    background: "#0000001a",
    backdrop: {
      filter: "blur(1px)",
    },
  },
  modal: {
    shadow: "0px 3px 6px 0px #00000033",
  },
};
