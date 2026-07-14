import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  // Flat, self-contained index.d.ts — the SDK inlines it via dts.resolve.
  dts: true,
  clean: true,
  sourcemap: false,
});
