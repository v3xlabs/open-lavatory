import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  // Signaling backends (and the modal) are loaded via dynamic import on
  // first connect. Without pre-bundling, Vite discovers them mid-handshake
  // and hard-reloads the page, killing the session. Keep this list in sync
  // with the dynamic imports in @openlv/signaling and @openlv/connector.
  optimizeDeps: {
    include: ["websocket-mqtt", "gun"],
  },
});
