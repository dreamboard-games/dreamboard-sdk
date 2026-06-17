import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts", "src/digest.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: false,
  external: ["zod"],
});
