import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import manifest from "./manifest.json";

// Get the current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(), // Handles React-specific features like JSX transformation
    crx({ manifest }), // Handles Chrome extension specific builds
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"), // Enables clean imports
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "index.html",
        background: resolve(__dirname, "src/background/index.ts"),
      },
    },
  },
});
