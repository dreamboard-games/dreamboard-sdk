import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export type Catalogs = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;
/** The workspace owns catalog names/specifiers; the lock owns their exact resolution. */
export async function readCatalogs(root: string): Promise<Catalogs> {
  const workspace = parse(
    await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8"),
  ) as {
    catalog?: Record<string, string>;
    catalogs?: Record<string, Record<string, string>>;
  };
  const lock = parse(
    await readFile(path.join(root, "pnpm-lock.yaml"), "utf8"),
  ) as {
    catalogs?: Record<
      string,
      Record<string, { specifier: string; version: string }>
    >;
  };
  const catalogs: Record<string, Record<string, string>> = {};
  for (const [name, entries] of Object.entries({
    default: workspace.catalog ?? {},
    ...workspace.catalogs,
  })) {
    catalogs[name] = {};
    for (const [dependency, specifier] of Object.entries(entries)) {
      const resolved = lock.catalogs?.[name]?.[dependency];
      if (
        resolved?.specifier === specifier &&
        /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(resolved.version)
      )
        catalogs[name][dependency] = resolved.version;
    }
  }
  return catalogs;
}
export function catalogVersion(
  catalogs: Catalogs,
  dependency: string,
  specifier: string,
): string {
  const name = specifier.slice("catalog:".length) || "default";
  const version = catalogs[name]?.[dependency];
  if (!version)
    throw new Error(
      `Catalog '${name}' has no current locked version for '${dependency}'.`,
    );
  return version;
}
