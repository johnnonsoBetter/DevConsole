import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// Vite config specifically for building the landing page for deployment (Vercel/Netlify)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  root: path.resolve(__dirname, "src/landing"),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist-landing"),
    emptyOutDir: true,
  },
  // Use absolute base for web deployment
  base: "/",
});
