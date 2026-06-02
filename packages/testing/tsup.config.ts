import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "node24",
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    "@dreamboard-games/app-sdk",
    "@dreamboard-games/ui-runtime",
    "@dreamboard-games/ui-sdk",
  ],
});
