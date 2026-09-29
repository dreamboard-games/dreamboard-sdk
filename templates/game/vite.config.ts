import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": new URL("./ui", import.meta.url).pathname,
      "@game": new URL("./ui/game.tsx", import.meta.url).pathname,
    },
  },
});
