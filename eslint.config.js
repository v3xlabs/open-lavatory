// ESLint v9 flat configuration file - Shared workspace configuration
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginSonarjs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint/config").FlatConfig[]} */
const config = [
  // Ignore patterns
  {
    ignores: [
      "**/dist/**",
      "node_modules/**",
      "**/*.gen.ts",
      ".wxt/**",
      "build/**",
      "coverage/**",
    ],
  },

  // Base JS configuration
  js.configs.recommended,

  // TypeScript configuration
  ...tseslint.configs.recommended,

  // Prettier configuration (must come last to override other formatting rules)
  eslintPluginPrettierRecommended,

  // React config for JSX/TSX files
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Common config for all JS/TS files
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
    },
    plugins: {
      import: eslintPluginImport,
      "simple-import-sort": eslintPluginSimpleImportSort,
      "unused-imports": eslintPluginUnusedImports,
      sonarjs: eslintPluginSonarjs,
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      // Basic style rules (disabled in favor of Prettier)
      semi: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": [
        "warn",
        { allow: ["warn", "error", "log", "debug", "info"] },
      ],
      "linebreak-style": ["error", "unix"],
      "object-curly-spacing": ["error", "always"],
      "no-multiple-empty-lines": ["warn", { max: 2 }],
      "prefer-destructuring": "warn",
      "prefer-arrow-callback": "warn",
      "max-lines": ["error", 200],

      // Import rules
      "import/no-duplicates": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // TypeScript rules
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",

      // SonarJS rules for code quality
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
      "sonarjs/no-identical-functions": "error",

      // Unicorn rules for modern JS practices
      "unicorn/prefer-module": "error",
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-array-for-each": "off", // Allow forEach
      "unicorn/prevent-abbreviations": "off", // Allow abbreviations

      // Padding lines for readability
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: ["return", "if", "switch", "try", "for"],
        },
        {
          blankLine: "always",
          prev: ["if", "switch", "try", "const", "let"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["const", "let"],
          next: ["const", "let"],
        },
      ],
    },
  },

  // Extension-specific config
  {
    files: ["packages/extension/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: "readonly",
      },
    },
  },
];

export default config;
