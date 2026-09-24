import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@game": new URL("./ui/game.ts", import.meta.url).pathname,
      "@": new URL("./ui", import.meta.url).pathname,
    },
  },
});
