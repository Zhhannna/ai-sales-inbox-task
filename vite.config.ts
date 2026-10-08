import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client" },
  server: {
    port: 5173,
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
});
