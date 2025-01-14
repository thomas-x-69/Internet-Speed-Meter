import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    react(), // Handles React-specific features like JSX transformation
    crx({ manifest }), // Handles Chrome extension specific builds
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Enables clean imports
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "index.html",
      },
    },
  },
});
