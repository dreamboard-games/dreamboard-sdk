import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const packageManifest = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts", "src/reducer.ts", "src/testing.ts"],
  format: ["esm"],
  platform: "neutral",
  target: "node24",
  define: {
    __DREAMBOARD_SDK_VERSION__: JSON.stringify(packageManifest.version),
  },
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  external: ["react", "react-dom", "@tanstack/react-store", "zod"],
});
