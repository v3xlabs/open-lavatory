// Flat config for ESLint v9
import js from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import eslintPluginSonarjs from "eslint-plugin-sonarjs"; import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import stylistic from '@stylistic/eslint-plugin'

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.wxt/**",
      "**/node_modules/**",
      ".changeset/**",
      "eslint.config.mjs",
      "**/*.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      import: pluginImport,
      "simple-import-sort": eslintPluginSimpleImportSort,
      "unused-imports": eslintPluginUnusedImports,
      sonarjs: eslintPluginSonarjs,
      unicorn: eslintPluginUnicorn,
      '@stylistic': stylistic
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='id']",
          message:
            "Use a descriptive identifier like user_id, blogpost_id, etc.",
        },
      ],
      "import/no-default-export": "error",
      "no-control-regex": "off",
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
      "max-lines": ["error", 500],
      "@stylistic/max-len": ["error", { code: 100, tabWidth: 4, ignoreComments: true }],

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
  {
    files: ["**/vitest.config.ts", "**/wxt.config.ts"],
    plugins: {
      import: pluginImport,
    },
    rules: {
      "import/no-default-export": "off",
    }
  }
];

// /** @type {import("eslint/config").FlatConfig[]} */
// const config = [
//   // Ignore patterns
//   {
//     ignores: [
//       "**/dist/**",
//       "node_modules/**",
//       "**/*.gen.ts",
//       ".wxt/**",
//       "build/**",
//       "coverage/**",
//     ],
//   },

//   // Base JS configuration
//   js.configs.recommended,

//   // TypeScript configuration
//   ...tseslint.configs.recommended,

//   // Prettier configuration (must come last to override other formatting rules)
//   eslintPluginPrettierRecommended,

//   // React config for JSX/TSX files
//   {
//     files: ["**/*.{jsx,tsx}"],
//     plugins: {
//       react: eslintPluginReact,
//       "react-hooks": eslintPluginReactHooks,
//       "react-refresh": eslintPluginReactRefresh,
//     },
//     languageOptions: {
//       parser: tseslint.parser,
//       parserOptions: {
//         ecmaFeatures: {
//           jsx: true,
//         },
//       },
//       globals: {
//         ...globals.browser,
//       },
//     },
//     settings: {
//       react: {
//         version: "detect",
//       },
//     },
//     rules: {
//       ...eslintPluginReact.configs.recommended.rules,
//       ...eslintPluginReactHooks.configs.recommended.rules,
//       "react/react-in-jsx-scope": "off",
//       "react-refresh/only-export-components": [
//         "warn",
//         { allowConstantExport: true },
//       ],
//     },
//   },

//   // Common config for all JS/TS files
//   {
//     files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
//     languageOptions: {
//       ecmaVersion: 2022,
//       sourceType: "module",
//       globals: {
//         ...globals.browser,
//         ...globals.node,
//       },
//       parser: tseslint.parser,
//     },
//     plugins: {
//     },
//     rules: {
//       // Basic style rules (disabled in favor of Prettier)

//     },
//   },

//   // Extension-specific config
//   {
//     files: ["packages/extension/**/*.{ts,tsx}"],
//     languageOptions: {
//       globals: {
//         ...globals.browser,
//         ...globals.webextensions,
//         chrome: "readonly",
//       },
//     },
//   },
// ];

// export default config;
