import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// All assets are bundled locally; nothing is fetched from a CDN at runtime.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
  },
});
