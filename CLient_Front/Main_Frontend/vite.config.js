import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      recharts: path.resolve(import.meta.dirname, "node_modules/recharts"),
    },
    dedupe: ["react", "react-dom", "recharts"],
  },
  server: {
    proxy: {
      "/api": "http://localhost:5174",
    },
  },
});