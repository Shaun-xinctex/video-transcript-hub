import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain Vite + React SPA. `vite build` emits a fully static bundle to dist/,
// which Vercel serves directly. Deep links (/app, /sign-in, ...) are handled
// client-side thanks to the SPA rewrite in vercel.json.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: true,
    port: 8080,
  },
  preview: {
    host: true,
    port: 8080,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
