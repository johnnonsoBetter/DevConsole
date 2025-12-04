import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        devtools: "src/devtools/devtools.html",
        panel: "src/devtools/index.html",
        popup: "src/popup/index.html",
        "page-hook-logic": "src/content/page-hook-logic.ts",
        landing: "src/landing/index.html",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Don't hash the page-hook-logic file so we can reference it reliably
          if (chunkInfo.name === "page-hook-logic") {
            return "page-hook-logic.js";
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
    // Copy public assets to dist
    copyPublicDir: true,
  },
  // Use relative base for Chrome extension
  base: "./",
});
