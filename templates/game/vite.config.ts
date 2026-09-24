import { defineConfig } from "vite";
export default defineConfig({
  resolve: {
    alias: { "@game": new URL("./ui/game.tsx", import.meta.url).pathname },
  },
});
