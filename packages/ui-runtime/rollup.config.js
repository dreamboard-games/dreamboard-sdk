import dts from "rollup-plugin-dts";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to strip JSDoc comments from the generated .d.ts file
function stripComments() {
  return {
    name: "strip-comments",
    renderChunk(code) {
      // Remove JSDoc comment blocks (/** ... */)
      let result = code.replace(/\/\*\*[\s\S]*?\*\//g, "");
      // Remove single-line comments starting with //
      result = result.replace(/^\s*\/\/.*$/gm, "");
      // Clean up multiple consecutive blank lines
      result = result.replace(/\n{3,}/g, "\n\n");
      return { code: result, map: null };
    },
  };
}

// Define entry points and their output filenames
const entries = [{ input: "./dist/index.d.ts", filename: "ui-runtime.d.ts" }];

// Output directories
const outputDirs = ["./dist"];

// Common rollup options
const commonExternal = [
  // Keep React and framer-motion as external
  "react",
  "react/jsx-runtime",
  "framer-motion",
  "@dreamboard/manifest-contract",
  "#dreamboard/ui-contract",
  "@dreamboard-games/ui-sdk",
  "@dreamboard-games/ui-sdk/components",
  "@dreamboard-games/ui-sdk/defaults",
];

const dtsPlugin = dts({
  respectExternal: true, // Respect the external array above
  compilerOptions: {
    paths: {
      "@dreamboard-games/api-client": [
        path.resolve(__dirname, "../api-client/dist/index.d.ts"),
      ],
    },
  },
});

// Generate config for each entry + output combination
export default entries.flatMap((entry) =>
  outputDirs.map((dir) => ({
    input: entry.input,
    output: {
      file: `${dir}/${entry.filename}`,
      format: "es",
    },
    external: commonExternal,
    plugins: [dtsPlugin, stripComments()],
  })),
);
