import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    dts({
      outDir: "dist",
      entryRoot: "src",
    }),
  ],
  build: {
    lib: {
      name: "OpenLVModal",
      entry: {
        index: "src/index.ts",
        "theme/index": "src/theme/index.tsx",
      },
      formats: ["es", "cjs"],
      fileName: (format, entry) => `${entry}.${format}.js`,
    },
    sourcemap: true,
    target: "es2020",
    cssCodeSplit: false, // Disable CSS code splitting to bundle CSS with JS
    rollupOptions: {
      external: [
        "preact",
        "preact/hooks",
        "preact/jsx-runtime",
        "preact-custom-element",
        "qrcode-generator",
      ],
    },
  },
});
