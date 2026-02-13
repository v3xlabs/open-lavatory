import { defineConfig } from "eslint/config";
import v3xlint from "eslint-plugin-v3xlabs";

export default defineConfig([
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".changeset/**",
      "**/*.js",
    ],
  },
  ...v3xlint.configs["recommended"],
]);
