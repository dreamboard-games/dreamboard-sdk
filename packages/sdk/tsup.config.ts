import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const packageManifest = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/package-set.ts",
    "src/plugin-runtime-contract.ts",
    "src/reference-games/index.ts",
    "src/types.ts",
    "src/reducer.ts",
    "src/reducer/advanced.ts",
    "src/ui.ts",
    "src/ui/components.ts",
    "src/ui/defaults.ts",
    "src/ui/player-state.ts",
    "src/testing.ts",
    "src/testing-runtime.ts",
    "src/testing-compiler.ts",
    "src/authoring-compiler.ts",
    "src/authoring-generate-cli.ts",
    "src/runtime.ts",
    "src/runtime/primitives.ts",
    "src/runtime/workspace-contract.ts",
    "src/runtime/runtime-api.ts",
    "src/codegen.ts",
    "src/authoring/index.ts",
    "src/reducer-contract.ts",
    "src/browser-interaction.ts",
  ],
  format: ["esm"],
  platform: "neutral",
  target: "node24",
  define: {
    __DREAMBOARD_SDK_VERSION__: JSON.stringify(packageManifest.version),
  },
  outDir: "dist",
  // Private workspace packages are inlined into the published bundle so the
  // package verifier can prove the tarball is self-contained.
  dts: {
    resolve: [
      /^@dreamboard-games\/(sdk-types|reducer-contract|workspace-codegen)(\/.*)?$/,
      /^@dreamboard-games\/plugin-runtime-contract(\/.*)?$/,
    ],
  },
  noExternal: [
    /^@dreamboard-games\/(sdk-types|reducer-contract|workspace-codegen)(\/|$)/,
    /^@dreamboard-games\/plugin-runtime-contract(\/|$)/,
  ],
  clean: true,
  sourcemap: true,
  splitting: true,
  external: [
    "@radix-ui/react-dialog",
    "@radix-ui/react-accordion",
    "@radix-ui/react-label",
    "@radix-ui/react-select",
    "@radix-ui/react-slot",
    "@radix-ui/react-tooltip",
    "@noble/hashes/sha2.js",
    "@noble/hashes/utils.js",
    "@use-gesture/react",
    "clsx",
    "framer-motion",
    "lucide-react",
    "react",
    "react-dom",
    "vaul",
    "zod",
    "zustand",
    "zustand/shallow",
    "zustand/vanilla",
  ],
});
