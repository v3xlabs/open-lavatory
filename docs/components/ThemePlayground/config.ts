/* eslint-disable no-restricted-syntax */
import type { ThemeTokensMap } from "@openlv/modal/theme";
import { openlvTheme, simpleTheme } from "@openlv/modal/theme";

export const BASE_THEMES = {
  simple: simpleTheme,
  openlv: openlvTheme,
} satisfies Record<string, ThemeTokensMap>;

export type BaseThemeName = keyof typeof BASE_THEMES | "none";

export const getBaseTheme = (name: keyof typeof BASE_THEMES): ThemeTokensMap =>
  BASE_THEMES[name];

export type PlainFieldDef = {
  label: string;
  path: string;
  type?: "color" | "text" | "range";
  conditional?: never;
};

export type ConditionalFieldDef = {
  conditional: true;
  fields: PlainFieldDef[];
};

export type FieldDef = PlainFieldDef | ConditionalFieldDef;

export type Section = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  fields: FieldDef[];
};

export const SECTIONS: Section[] = [
  {
    id: "typography",
    title: "Typography & Layout",
    defaultOpen: true,
    fields: [
      { label: "Font Family", path: "font.family", type: "text" },
      { label: "Radius", path: "border.radius", type: "range" },
      {
        conditional: true,
        fields: [
          { label: "Border Color", path: "border.color" },
          { label: "Border Width", path: "border.width", type: "text" },
        ],
      },
    ],
  },
  {
    id: "body",
    title: "Body & Background",
    defaultOpen: true,
    fields: [
      { label: "Background", path: "body.background" },
      { label: "Text Color", path: "body.color" },
    ],
  },
  {
    id: "text",
    title: "Text Colors",
    fields: [
      { label: "Primary Text", path: "text.primary" },
      { label: "Secondary Text", path: "text.secondary" },
      { label: "Muted Text", path: "text.muted" },
      {
        conditional: true,
        fields: [{ label: "Heading Text", path: "text.heading" }],
      },
      {
        conditional: true,
        fields: [{ label: "Body Text", path: "text.body" }],
      },
    ],
  },
  {
    id: "overlay",
    title: "Overlay & Modal",
    fields: [
      { label: "Overlay BG", path: "overlay.background" },
      {
        label: "Backdrop Filter",
        path: "overlay.backdrop.filter",
        type: "text",
      },
      { label: "Modal Shadow", path: "modal.shadow", type: "text" },
    ],
  },
  {
    id: "button-primary",
    title: "Primary Button",
    fields: [
      { label: "Background", path: "control.button.primary.background" },
      { label: "Text Color", path: "control.button.primary.color" },
      { label: "Border", path: "control.button.primary.border" },
      {
        label: "Padding",
        path: "control.button.primary.padding",
        type: "text",
      },
      { label: "Hover BG", path: "control.button.primary.hoverBackground" },
      { label: "Active BG", path: "control.button.primary.activeBackground" },
      {
        label: "Disabled BG",
        path: "control.button.primary.disabledBackground",
      },
      { label: "Disabled Color", path: "control.button.primary.disabledColor" },
    ],
  },
  {
    id: "button-secondary",
    title: "Secondary Button",
    fields: [
      { label: "Background", path: "control.button.secondary.background" },
      { label: "Text Color", path: "control.button.secondary.color" },
      { label: "Border", path: "control.button.secondary.border" },
      { label: "Hover BG", path: "control.button.secondary.hoverBackground" },
      { label: "Active BG", path: "control.button.secondary.activeBackground" },
      {
        label: "Disabled BG",
        path: "control.button.secondary.disabledBackground",
      },
      {
        label: "Disabled Color",
        path: "control.button.secondary.disabledColor",
      },
      {
        conditional: true,
        fields: [
          {
            label: "Selected BG",
            path: "control.button.secondary.selectedBackground",
          },
          {
            label: "Selected Color",
            path: "control.button.secondary.selectedColor",
          },
        ],
      },
    ],
  },
  {
    id: "button-tertiary",
    title: "Tertiary Button",
    fields: [
      { label: "Text Color", path: "control.button.tertiary.color" },
      { label: "Hover BG", path: "control.button.tertiary.hoverBackground" },
      { label: "Active BG", path: "control.button.tertiary.activeBackground" },
      {
        label: "Disabled Color",
        path: "control.button.tertiary.disabledColor",
      },
    ],
  },
  {
    id: "input",
    title: "Input Fields",
    fields: [
      { label: "Background", path: "control.input.background" },
      { label: "Border", path: "control.input.border" },
      { label: "Text Color", path: "control.input.text" },
    ],
  },
  {
    id: "cards",
    title: "Cards & QR",
    fields: [
      { label: "Card Background", path: "card.background" },
      { label: "QR Background", path: "qr.background" },
      { label: "QR Color", path: "qr.color" },
    ],
  },
];
