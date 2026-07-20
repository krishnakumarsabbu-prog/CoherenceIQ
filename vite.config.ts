import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          "ag-grid": ["ag-grid-enterprise", "ag-grid-react"],
          echarts: ["echarts", "echarts-for-react"],
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
          flow: ["reactflow"],
        },
      },
    },
  },
});
