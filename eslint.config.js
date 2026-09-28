import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import tseslint from "typescript-eslint";

const typedRules = {
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "no-restricted-syntax": [
    "error",
    {
      selector:
        ":matches(TSAsExpression, TSTypeAssertion)[typeAnnotation.type='TSNeverKeyword']",
      message:
        "Do not use never to bypass a contract. Use an honest owner signature or an explicit runtime-invalid test.",
    },
    {
      selector:
        ":matches(TSAsExpression, TSTypeAssertion):has(> :matches(TSAsExpression, TSTypeAssertion).expression)",
      message:
        "Chained assertions require a locally documented construction or validation boundary.",
    },
    {
      selector:
        ":matches(TSAsExpression, TSTypeAssertion) TSTypeReference[typeName.name=/^(ReadModel|FeatureContext|CoreInstance|TargetOptions|InputBase|GameInstance)$/] TSUnknownKeyword",
      message:
        "Do not erase a game facade to unknown; use its concrete runtime capability.",
    },
  ],
};
const owners = [
  ["packages/sdk/**/*.{ts,tsx}", "packages/sdk/tsconfig.eslint.json"],
  ["registry/**/*.{ts,tsx}", "registry/tsconfig.json"],
  [
    "examples/reference-games/hearts/**/*.{ts,tsx}",
    "examples/reference-games/hearts/tsconfig.eslint.json",
  ],
  [
    "examples/reference-games/hex-network-trading/**/*.{ts,tsx}",
    "examples/reference-games/hex-network-trading/tsconfig.json",
  ],
  ["templates/game/**/*.{ts,tsx}", "templates/game/tsconfig.json"],
  ["scripts/**/*.ts", "tsconfig.scripts.json"],
];
export default [
  {
    ignores: [
      "**/dist/**",
      "**/generated/**",
      "**/node_modules/**",
      "**/build/**",
      "**/storybook-static/**",
      "**/test-results/**",
      "**/playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: { "eslint-comments": eslintComments },
    rules: {
      "eslint-comments/require-description": [
        "error",
        { ignore: ["eslint-enable"] },
      ],
    },
  },
  ...owners.map(([files, project]) => ({
    files: [files],
    languageOptions: {
      parserOptions: { project, tsconfigRootDir: import.meta.dirname },
    },
    rules: typedRules,
  })),
  // These files are compiled proof programs, not runtime programs: unused declarations
  // and bare property accesses intentionally test inference and rejected properties.
  {
    files: [
      "packages/sdk/type-tests/**/*.ts",
      "packages/sdk/src/**/*.type-test.ts",
      "packages/sdk/consumer-tests/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    files: ["packages/sdk/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["packages/sdk/src/reducer/bundle/**/*.ts"],
    rules: { "no-console": "error" },
  },
];
