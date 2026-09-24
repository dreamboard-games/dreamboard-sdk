import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../..", import.meta.url));
const entries = {
  root: "index",
  react: "react",
  reducer: "reducer",
  testing: "testing",
};

/** Verify documented public names using TypeScript's resolved barrel exports. */
export async function checkApiDocs(): Promise<void> {
  const configPath = path.join(root, "packages/sdk/tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );
  const program = ts.createProgram(
    Object.values(entries).map((name) =>
      path.join(root, `packages/sdk/src/${name}.ts`),
    ),
    parsed.options,
  );
  const checker = program.getTypeChecker();
  const exports = new Map(
    Object.entries(entries).map(([entry, file]) => {
      const source = program.getSourceFile(
        path.join(root, `packages/sdk/src/${file}.ts`),
      )!;
      const symbol = checker.getSymbolAtLocation(source)!;
      return [
        entry,
        new Set(checker.getExportsOfModule(symbol).map((value) => value.name)),
      ];
    }),
  );
  let checked = 0;
  async function visit(directory: string): Promise<void> {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await visit(file);
      else if (item.name.endsWith(".md")) {
        const content = await readFile(file, "utf8");
        const declarations = [
          ...content.matchAll(/<!-- api: (\w+) (\w+) -->/g),
        ];
        if (directory.includes(`${path.sep}api`) && declarations.length === 0)
          throw new Error(`API page has no checked public name: ${file}`);
        for (const [, entry, name] of declarations) {
          if (!exports.get(entry)?.has(name))
            throw new Error(`${file}: ${entry} does not export ${name}`);
          checked++;
        }
      }
    }
  }
  await visit(path.join(root, "docs"));
  if (!checked) throw new Error("No public API names documented.");
  console.log(
    `Verified ${checked} documented API names against four public entrypoints.`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await checkApiDocs();
