import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    // dts({
    //   insertTypesEntry: true,
    //   outDir: "dist",
    //   rollupTypes: true,
    // }),
  ],
  build: {
    lib: {
      name: "OpenLVModal",
      entry: "src/index.ts",
      formats: ["es", "cjs", "iife"],
      fileName: (format) => `index.${format}.js`,
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
      output: {
        // Inline CSS into the JS bundle
        inlineDynamicImports: true,
      },
    },
  },
});
