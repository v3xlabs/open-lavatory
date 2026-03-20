import { defineConfig } from "wxt";

// https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  manifest: {
    name: "Open Lavatory",
    description: "Privacy-first wallet connection for dApps",
    version: "0.0.1",

    permissions: ["storage", "windows"],

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
      target: "esnext",
      sourcemap: "inline",
    },
  }),
  webExt: {
    startUrls: [
      "https://openlv.sh",
      "https://swap.cow.fi",
      "https://family.co/docs/connectkit/try-it-out",
    ],
  },
});
