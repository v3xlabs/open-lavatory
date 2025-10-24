import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
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
