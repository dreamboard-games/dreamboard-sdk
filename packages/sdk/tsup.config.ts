import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/package-set.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "node24",
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: [
    "@dreamboard-games/api-client",
    "@dreamboard-games/app-sdk",
    "@dreamboard-games/reducer-contract",
    "@dreamboard-games/sdk-types",
    "@dreamboard-games/testing",
    "@dreamboard-games/ui-runtime",
    "@dreamboard-games/ui-sdk",
    "@dreamboard-games/workspace-codegen",
  ],
});
