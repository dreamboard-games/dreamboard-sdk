import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { ESLint } from "eslint";
import { rootDir } from "../lib/paths.ts";

// Exercise the repository policy itself without requiring synthetic files in a
// TypeScript project. Type-aware built-in rules are verified by the normal gate.
const eslint = new ESLint({
  cwd: rootDir,
  overrideConfig: {
    languageOptions: { parserOptions: { project: false } },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
});
async function messages(source: string) {
  const [result] = await eslint.lintText(source, {
    filePath: path.join(rootDir, "packages/sdk/src/type-policy-probe.ts"),
  });
  assert.ok(result);
  return result.messages;
}

test("type policy rejects chained assertions, never escapes and erased game facades", async () => {
  for (const source of [
    "const value = raw as unknown as Specific;",
    "const value = <Specific><unknown>raw;",
    "const value = raw as never;",
    "const value = <never>raw;",
    "const value = raw as ReadModel<unknown>;",
    "const value = raw as TargetOptions<unknown>;",
  ]) {
    assert.equal(
      (await messages(source)).filter(
        (message) => message.ruleId === "no-restricted-syntax",
      ).length,
      1,
      source,
    );
  }
});

test("unknown ingress remains valid and boundary exceptions require explanations", async () => {
  assert.deepEqual(
    await messages("export function parse(raw: unknown) { return raw; }"),
    [],
  );
  const unexplained = await messages(
    "// eslint-disable-next-line no-restricted-syntax\nconst value = raw as unknown as Specific;",
  );
  assert.ok(
    unexplained.some(
      (message) => message.ruleId === "eslint-comments/require-description",
    ),
  );
  assert.deepEqual(
    await messages(
      "// eslint-disable-next-line no-restricted-syntax -- This fixture tests a documented construction boundary.\nconst value = raw as unknown as Specific;",
    ),
    [],
  );
  assert.ok(
    (
      await messages(
        "// eslint-disable-next-line no-restricted-syntax -- Unused exception must fail.\nconst value = raw;",
      )
    ).some((message) => message.message.includes("Unused eslint-disable")),
  );
});
