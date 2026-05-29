import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(distDir, "public");

if (!existsSync(publicDir)) {
  console.error(
    "[docs] Expected dist/public after build (is renderStrategy: full-static set?)",
  );
  process.exit(1);
}

const stagingDir = path.join(rootDir, ".dist-static-staging");
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

for (const entry of readdirSync(publicDir)) {
  cpSync(path.join(publicDir, entry), path.join(stagingDir, entry), {
    recursive: true,
  });
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const entry of readdirSync(stagingDir)) {
  cpSync(path.join(stagingDir, entry), path.join(distDir, entry), {
    recursive: true,
  });
}

rmSync(stagingDir, { recursive: true, force: true });

console.log("[docs] Static deploy output ready in dist/");
