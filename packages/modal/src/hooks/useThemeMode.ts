import { useEffect, useState } from "preact/hooks";

import { resolveMode } from "../theme/index.js";
import { useThemeConfig } from "./useThemeConfig.js";

export const useThemeMode = (): "light" | "dark" => {
  const { appThemeMode, userTheme } = useThemeConfig();
  const [mode, setMode] = useState<"light" | "dark">(() =>
    resolveMode(appThemeMode, userTheme),
  );

  useEffect(() => {
    const updateMode = () => {
      setMode(resolveMode(appThemeMode, userTheme));
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", updateMode);
    updateMode();

    return () => {
      mediaQuery.removeEventListener("change", updateMode);
    };
  }, [appThemeMode, userTheme]);

  return mode;
};
