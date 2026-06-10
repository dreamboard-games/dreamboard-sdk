import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/bundle.ts",
    "generated/wire.ts",
    "generated/zod.ts",
    "generated/builders.ts",
    "generated/version.ts",
  ],
  format: ["esm"],
  outDir: "dist",
  // Flat, self-contained .d.ts per entry (dist/src/*, dist/generated/*) — the
  // SDK inlines these via dts.resolve, so they must not contain relative
  // imports to sibling declaration files.
  dts: true,
  clean: true,
  sourcemap: false,
  external: ["zod"],
});
