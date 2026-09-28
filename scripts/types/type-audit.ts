import { glob, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { rootDir } from "../lib/paths.ts";

export type TypeAuditEntry = {
  file: string;
  line: number;
  kind: "assertion" | "non-null" | "unknown" | "any";
  syntax: string;
};

export function inspectTypeBoundaries(
  file: string,
  source: string,
): TypeAuditEntry[] {
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const entries: TypeAuditEntry[] = [];
  function visit(node: ts.Node) {
    const kind =
      ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)
        ? "assertion"
        : ts.isNonNullExpression(node)
          ? "non-null"
          : node.kind === ts.SyntaxKind.UnknownKeyword
            ? "unknown"
            : node.kind === ts.SyntaxKind.AnyKeyword
              ? "any"
              : undefined;
    if (kind)
      entries.push({
        file,
        line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        kind,
        syntax: node.getText(tree),
      });
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return entries;
}

/** Complete inventory, never an allowed-count baseline or a substitute for typed lint. */
export async function auditTypes(): Promise<void> {
  const { readFile } = await import("node:fs/promises");
  const roots = [
    "packages/sdk",
    "registry",
    "examples/reference-games",
    "templates/game",
    "scripts",
  ];
  const entries: TypeAuditEntry[] = [];
  let files = 0;
  const excludes = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/generated/**",
    "**/test-results/**",
    "**/playwright-report/**",
    "**/storybook-static/**",
  ];
  for await (const file of glob(
    roots.map((root) => `${root}/**/*.{ts,tsx}`),
    { cwd: rootDir, exclude: excludes },
  )) {
    entries.push(
      ...inspectTypeBoundaries(
        file,
        await readFile(path.join(rootDir, file), "utf8"),
      ),
    );
    files++;
  }
  entries.sort(
    (left, right) =>
      left.file.localeCompare(right.file) || left.line - right.line,
  );
  const output = path.join(rootDir, "build/type-audit/inventory.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ files, entries }, null, 2) + "\n");
  console.log(
    `Audited ${files} authored TypeScript files; ${entries.length} type boundaries recorded at build/type-audit/inventory.json.`,
  );
}
