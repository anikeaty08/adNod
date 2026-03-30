import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import path from "node:path";

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "fhenixjs-bundled": path.resolve(__dirname, "./node_modules/fhenixjs/dist/fhenix.esm.js"),
    },
  },
  optimizeDeps: {
    exclude: ["fhenixjs"],
  },
});
