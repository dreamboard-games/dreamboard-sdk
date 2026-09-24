import { readFile } from "node:fs/promises";
import { registrySchema, registryItemSchema } from "shadcn/schema";
import ts from "typescript";
const registry = registrySchema.parse(
  JSON.parse(
    await readFile(new URL("../registry.json", import.meta.url), "utf8"),
  ),
);
const names = new Set(registry.items.map((item) => item.name));
if (names.size !== registry.items.length)
  throw new Error("Duplicate registry item name");
for (const item of registry.items) {
  registryItemSchema.parse(item);
  for (const dependency of item.registryDependencies ?? []) {
    if (
      !dependency.startsWith("@dreamboard/") ||
      !names.has(dependency.slice(12))
    )
      throw new Error(`Unknown dependency: ${dependency}`);
  }
  for (const file of item.files ?? []) {
    const source = await readFile(
      new URL(`../${file.path}`, import.meta.url),
      "utf8",
    );
    if (!/\.tsx?$/.test(file.path)) continue;
    const ast = ts.createSourceFile(
      file.path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    for (const node of ast.statements) {
      if (
        !ts.isImportDeclaration(node) ||
        !ts.isStringLiteral(node.moduleSpecifier)
      )
        continue;
      const name = node.moduleSpecifier.text;
      if (
        name !== "react" &&
        !name.startsWith("./") &&
        !(item.meta?.binding === "workspace" && name === "@game") &&
        !(item.meta?.binding === "test" && name === "@playwright/test")
      )
        throw new Error(`Non-pure import in ${file.path}: ${name}`);
    }
  }
}
console.log(`Validated ${names.size} registry items with shadcn schemas.`);
