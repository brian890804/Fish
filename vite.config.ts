import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "釣況紀錄",
        short_name: "釣況",
        description: "記錄每次出釣的釣獲與海況，分析最佳出釣條件",
        theme_color: "#0a0f16",
        background_color: "#0a0f16",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
  build: { sourcemap: false },
});
