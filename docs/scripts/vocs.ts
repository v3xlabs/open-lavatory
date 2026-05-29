import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import * as vite from "vite";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vocsDir = path.join(rootDir, "node_modules", "vocs", "dist");

const Config = await import(
  pathToFileURL(path.join(vocsDir, "internal/config.js")).href
);
const { vocs } = await import(
  pathToFileURL(path.join(vocsDir, "waku/vite.js")).href
);

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

const command = process.argv[2];

if (command === "dev") {
  const port = Number(process.env.PORT ?? 5173);
  const server = await vite.createServer({
    configFile: false,
    root: rootDir,
    plugins: [solidWebAlias(), react(), ...(await vocs())],
    server: {
      port,
      fs: { allow: [path.resolve(rootDir, "..")] },
    },
  });
  await server.listen();
  server.printUrls();
} else if (command === "build") {
  const config = await Config.resolve({ rootDir });
  const builder = await vite.createBuilder({
    configFile: false,
    root: rootDir,
    plugins: [solidWebAlias(), react(), ...(await vocs())],
    build: { outDir: config.outDir },
  });
  await builder.buildApp();
} else {
  console.error("Usage: tsx scripts/vocs.ts <dev|build>");
  process.exit(1);
}
