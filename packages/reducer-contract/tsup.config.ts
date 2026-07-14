import { defineConfig, type Options } from "tsup";

// Flat, self-contained .d.ts per entry (dist/src/*, dist/generated/*) — the
// SDK inlines these via dts.resolve, so they must not contain relative
// imports to sibling declaration files. A single multi-entry dts build lets
// rollup-plugin-dts hoist shared types into sibling chunk files, so each
// entry is built in isolation to force full inlining.
const ENTRIES = [
  "src/index",
  "src/bundle",
  "generated/wire",
  "generated/zod",
  "generated/builders",
  "generated/version",
] as const;

export default defineConfig(
  ENTRIES.map(
    (entry, index): Options => ({
      entry: { [entry]: `${entry}.ts` },
      format: ["esm"],
      outDir: "dist",
      dts: true,
      clean: index === 0,
      sourcemap: false,
      external: ["zod"],
    }),
  ),
);
