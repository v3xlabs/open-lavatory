import "../../styles.css";

import type { ThemeTokensMap } from "@openlv/modal/theme";
import { useCallback, useEffect, useMemo, useState } from "react";
import { codeToHtml } from "shiki";

import { generateCode } from "./codegen.js";
import { type BaseThemeName, getBaseTheme } from "./config.js";
import { ThemeControls } from "./ThemeControls.js";
import { ThemePreview } from "./ThemePreview.js";
import { deepMerge, setNested } from "./utils.js";

const CodeBlock = ({ code }: { code: string; }) => {
  const [html, setHtml] = useState<string>(`<pre>${code}</pre>`);

  useEffect(() => {
    void codeToHtml(code, {
      lang: "tsx",
      themes: { light: "github-light", dark: "github-dark-dimmed" },
    }).then(setHtml);
  }, [code]);

  return (
    <div
      className="vocs_CodeBlock"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const ThemePlayground = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [baseTheme, setBaseTheme] = useState<BaseThemeName>("simple");
  const [theme, setTheme] = useState<ThemeTokensMap>(
    structuredClone(getBaseTheme("simple")),
  );

  const currentTheme = useMemo(
    () => deepMerge(theme.common ?? {}, theme[mode] ?? {}),
    [theme, mode],
  );

  const updateThemeValue = useCallback(
    (path: string, value: string) => {
      setTheme(prev => ({
        ...prev,
        [mode]: setNested(prev[mode] ?? {}, path, value),
      }));
    },
    [mode],
  );

  const switchBaseTheme = useCallback((newBase: BaseThemeName) => {
    setBaseTheme(newBase);

    if (newBase !== "none") {
      setTheme(structuredClone(getBaseTheme(newBase)));
    }
  }, []);

  return (
    <div className="my-6 space-y-4">
      <ThemePreview theme={theme} mode={mode} />

      <ThemeControls
        mode={mode}
        setMode={setMode}
        baseTheme={baseTheme}
        switchBaseTheme={switchBaseTheme}
        currentTheme={currentTheme}
        updateThemeValue={updateThemeValue}
      />

      <CodeBlock code={generateCode(theme, baseTheme)} />
    </div>
  );
};

export const ThemePlaygroundWrapper = () =>
  (globalThis.window && <ThemePlayground />);
