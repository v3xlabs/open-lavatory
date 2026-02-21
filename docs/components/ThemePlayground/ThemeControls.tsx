/* eslint-disable no-restricted-syntax */
import { memo, useState } from "react";

import type { BaseThemeName, PlainFieldDef } from "./config.js";
import { SECTIONS } from "./config.js";
import { getNested } from "./utils.js";

const isHexColor = (val: string) => /^#[\da-f]{3,8}$/i.test(val);

const Input = ({
  inputId,
  value,
  onChange,
  type = "color",
}: {
  type?: "color" | "text" | "range";
  inputId: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  switch (type) {
    case "range": {
      const num = Number.parseFloat(value) || 0;

      return (
        <>
          <input
            id={inputId}
            type="range"
            min="0"
            max="32"
            step="0.5"
            value={num}
            onChange={e => onChange(`${e.target.value}px`)}
            className="flex-1"
          />
          <span className="w-12 text-right font-mono text-xs text-(--vocs-color_text2) tabular-nums">
            {num}
            px
          </span>
        </>
      );
    }

    case "text": {
      return (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-48 rounded border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeBlockBackground) px-2 py-1 text-sm"
        />
      );
    }

    default: {
      const canUsePicker = isHexColor(value);

      return (
        <div className="flex items-center gap-1.5">
          <div
            className="relative h-7 w-7 shrink-0 overflow-hidden rounded border border-(--vocs-color_codeInlineBorder)"
            title={
              canUsePicker
                ? undefined
                : "Non-hex value — use the text field to edit"
            }
          >
            <div className="absolute inset-0" style={{ backgroundColor: value }} />
            {canUsePicker && (
              <input
                id={inputId}
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Pick color"
              />
            )}
          </div>
          <input
            id={canUsePicker ? undefined : inputId}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-24 rounded border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeBlockBackground) px-2 py-1 font-mono text-xs"
            placeholder="#000000"
            aria-label="Color value"
          />
        </div>
      );
    }
  }
};

const FieldRow = memo(
  ({
    field,
    currentTheme,
    onChange,
  }: {
    field: PlainFieldDef;
    currentTheme: Record<string, unknown>;
    onChange: (path: string, value: string) => void;
  }) => {
    const type = field.type ?? "color";
    const value = (getNested(currentTheme, field.path) as string) ?? "";
    const fieldId = `field-${field.path}`;

    return (
      <div
        className={`flex items-center ${type === "range" ? "gap-3" : "justify-between gap-2"} py-1`}
      >
        <label
          htmlFor={fieldId}
          className="shrink-0 text-sm text-(--vocs-color_text2)"
        >
          {field.label}
        </label>
        <Input
          inputId={fieldId}
          value={value}
          onChange={val => onChange(field.path, val)}
          type={type}
        />
      </div>
    );
  },
);

const ThemeSection = ({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeTitleBackground)">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-(--vocs-color_codeBlockBackground)"
      >
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs">{isOpen ? "\u2212" : "+"}</span>
      </button>
      {isOpen && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
};

type ThemeControlsProps = {
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
  baseTheme: BaseThemeName;
  switchBaseTheme: (base: BaseThemeName) => void;
  currentTheme: Record<string, unknown>;
  updateThemeValue: (path: string, value: string) => void;
};

export const ThemeControls = ({
  mode,
  setMode,
  baseTheme,
  switchBaseTheme,
  currentTheme,
  updateThemeValue,
}: ThemeControlsProps) => (
  <div className="rounded-lg border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeBlockBackground) p-4">
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="theme-select" className="text-sm font-semibold">
          Inherit From:
        </label>
        <select
          id="theme-select"
          value={baseTheme}
          onChange={e => switchBaseTheme(e.target.value as BaseThemeName)}
          className="rounded border border-(--vocs-color_codeInlineBorder) bg-(--vocs-color_codeTitleBackground) px-3 py-1 text-sm"
        >
          <option value="simple">Simple</option>
          <option value="openlv">OpenLV</option>
          <option value="none">None (fully custom)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Preview Mode:</span>
        <div className="flex rounded border border-(--vocs-color_codeInlineBorder)">
          <button
            type="button"
            onClick={() => setMode("light")}
            className={`rounded-l px-3 py-1 text-sm transition-colors ${mode === "light" ? "bg-(--vocs-color_codeInlineText) text-(--vocs-color_background)" : "bg-(--vocs-color_codeTitleBackground) hover:bg-(--vocs-color_codeBlockBackground)"}`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setMode("dark")}
            className={`rounded-r px-3 py-1 text-sm transition-colors ${mode === "dark" ? "bg-(--vocs-color_codeInlineText) text-(--vocs-color_background)" : "bg-(--vocs-color_codeTitleBackground) hover:bg-(--vocs-color_codeBlockBackground)"}`}
          >
            Dark
          </button>
        </div>
      </div>
    </div>

    <div className="max-h-150 space-y-2 overflow-y-auto pr-2">
      {SECTIONS.map(section => (
        <ThemeSection
          key={section.id}
          title={section.title}
          defaultOpen={section.defaultOpen}
        >
          {section.fields.flatMap((entry) => {
            if ("conditional" in entry) {
              return (entry as typeof entry & { fields: PlainFieldDef[]; }).fields
                .filter(f => getNested(currentTheme, f.path) !== undefined)
                .map(f => (
                  <FieldRow
                    key={f.path}
                    field={f}
                    currentTheme={currentTheme}
                    onChange={updateThemeValue}
                  />
                ));
            }

            return [
              <FieldRow
                key={entry.path}
                field={entry}
                currentTheme={currentTheme}
                onChange={updateThemeValue}
              />,
            ];
          })}
        </ThemeSection>
      ))}
    </div>
  </div>
);
