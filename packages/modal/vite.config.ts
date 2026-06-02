import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solid(),
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
      },
      formats: ["es", "cjs"],
      fileName: (format, entry) => `${entry}.${format}.js`,
    },
    sourcemap: true,
    target: "es2020",
    cssCodeSplit: false, // Disable CSS code splitting to bundle CSS with JS
    rollupOptions: {
      // `@openlv/modal` ships as a self-contained browser web component, so we
      // bundle solid-js into the output. Leaving `solid-js/web` external made
      // the published dist import `use` from it, which only exists in solid's
      // browser build — breaking any consumer that bundles the modal under
      // server/SSR conditions (e.g. vocs' full-static docs build).
      external: ["qrcode-generator"],
    },
  },
});
