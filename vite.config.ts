import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import path from "node:path";

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@cofhe") || id.includes("node_modules/tfhe")) {
            return "cofhe";
          }

          if (id.includes("node_modules/wagmi") || id.includes("node_modules/viem") || id.includes("node_modules/@walletconnect")) {
            return "wallet";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/wouter")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/recharts") || id.includes("node_modules/framer-motion") || id.includes("node_modules/gsap") || id.includes("node_modules/lucide-react")) {
            return "ui-vendor";
          }

          return undefined;
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
