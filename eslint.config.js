import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/generated/**",
      "**/node_modules/**",
      "**/storybook-static/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/sdk/src/reducer/bundle/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },
];
