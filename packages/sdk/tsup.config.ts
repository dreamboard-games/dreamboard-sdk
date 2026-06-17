import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/package-set.ts",
    "src/types.ts",
    "src/reducer.ts",
    "src/reducer/advanced.ts",
    "src/ui.ts",
    "src/ui/components.ts",
    "src/ui/defaults.ts",
    "src/ui/player-state.ts",
    "src/testing.ts",
    "src/runtime.ts",
    "src/runtime/primitives.ts",
    "src/runtime/workspace-contract.ts",
    "src/runtime/runtime-api.ts",
    "src/codegen.ts",
    "src/reducer-contract.ts",
    "src/browser-interaction.ts",
  ],
  format: ["esm"],
  platform: "neutral",
  target: "node24",
  outDir: "dist",
  // Private workspace packages are inlined into the published bundle (JS and
  // declarations) so the tarball stays self-contained — enforced by
  // scripts/assert-sdk-tarball-self-contained.mjs.
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
