import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          charts: ["recharts"],
          topology: ["@xyflow/react"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/ws": { target: "ws://127.0.0.1:8080", ws: true },
      "/api": "http://127.0.0.1:8080",
      "/actuator": "http://127.0.0.1:8080",
    },
  },
});
