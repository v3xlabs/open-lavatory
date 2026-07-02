import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { resolveConfig } from "vocs/config";
import { vocs } from "vocs/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const solidWebPath = path.resolve(
  rootDir,
  "node_modules/solid-js/web/dist/web.js",
);

const solidWebAlias = (): PluginOption => ({
  name: "openlv:solid-web-alias",
  config: () => ({
    resolve: {
      alias: {
        "solid-js/web": solidWebPath,
      },
    },
  }),
});

export default defineConfig(async () => {
  const config = await resolveConfig({ rootDir });

  return {
    root: rootDir,
    plugins: [solidWebAlias(), react(), ...(await vocs())],
    build: {
      outDir: config.outDir,
    },
    // Signaling backends (and the modal) are loaded via dynamic import on
    // first connect. Without pre-bundling, Vite discovers them mid-handshake
    // and hard-reloads the page, killing the session. Keep this list in sync
    // with the dynamic imports in @openlv/signaling and @openlv/connector.
    optimizeDeps: {
      include: [
        "websocket-mqtt",
        "gun",
        "solid-js",
        "solid-js/store",
        "lucide-solid",
      ],
    },
    server: {
      fs: { allow: [path.resolve(rootDir, "..")] },
    },
  };
});
