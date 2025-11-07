import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "Open Lavatory",
    description: "Privacy-first wallet connection for dApps",
    version: "0.0.1",

    permissions: ["storage", "activeTab", "scripting"],

    host_permissions: [
      "https://*/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ],

    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["<all_urls>"],
      },
    ],

    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
  vite: () => ({
    define: {
      global: "globalThis",
    },
    build: {
      target: "es2020",
      sourcemap: "inline",
      rollupOptions: {
        external: [],
      },
    },
  }),
  webExt: {
    startUrls: [
      "https://openlv.sh",
      "https://swap.cow.fi",
      "https://v3x.company",
    ],
  },
});
