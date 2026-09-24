import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwind()],
  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./ui/game.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./ui", import.meta.url)),
    },
  },
  build: { target: "es2022" },
});
