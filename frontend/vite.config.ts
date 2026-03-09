import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["conflict-terminal.xyz"],
    hmr: {
      // Use a dedicated path so non-WS traffic doesn't hit the HMR socket
      path: "/__vite_hmr",
    },
    proxy: {
      "/api": {
        target: "http://backend:4000",
        changeOrigin: true,
      },
    },
  },
});
