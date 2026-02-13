import { defineConfig } from "eslint/config";
import v3xlint from "eslint-plugin-v3xlabs";

// eslint-disable-next-line import/no-default-export -- ESLint flat config requires default export
export default defineConfig([
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".changeset/**",
      "**/*.js",
      "**/.wxt/**",
      "**/.expo/**",
      "docs/snippets/**",
    ],
  },
  ...v3xlint.configs["recommended"],
  ...v3xlint.configs["react"],
  {
    rules: {
      "unicorn/no-useless-undefined": "off",
    },
  },
]);
