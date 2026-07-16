import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";

import {
  compareCanonicalStrings,
  expectRecord,
  readJson,
  sha256File,
} from "./support.ts";

interface FixtureBundleEntry {
  readonly id: string;
  readonly file: string;
  readonly renderModule: string;
  readonly renderModuleSha256: string;
  readonly components?: readonly string[];
  readonly capabilities?: readonly string[];
}

interface ScenarioCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly fixtureUrl: string;
  readonly renderModuleUrl: string;
  readonly renderModule: string;
  readonly components: readonly string[];
  readonly capabilities: readonly string[];
  readonly viewportTags: readonly string[];
  readonly sourceDigest: string;
}

function strings(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function relativeBundlePath(value: unknown, label: string): string {
  const result = requiredString(value, label);
  if (path.isAbsolute(result) || result.split(/[\\/]+/).includes("..")) {
    throw new Error(`${label} must stay inside the generated fixture bundle.`);
  }
  return result;
}

async function readFixtureEntries(
  fixtureBundleRoot: string,
): Promise<readonly FixtureBundleEntry[]> {
  const bundle = expectRecord(
    await readJson(path.join(fixtureBundleRoot, "index.json")),
    "fixture bundle",
  );
  if (bundle.schemaVersion !== 2 || !Array.isArray(bundle.fixtures)) {
    throw new Error(
      "The generated UI fixture bundle must use schemaVersion 2.",
    );
  }
  return bundle.fixtures.map((value, index) => {
    const entry = expectRecord(value, `fixture bundle entry ${index}`);
    return {
      id: requiredString(entry.id, `fixture bundle entry ${index}.id`),
      file: relativeBundlePath(entry.file, `${String(entry.id)}.file`),
      renderModule: relativeBundlePath(
        entry.renderModule,
        `${String(entry.id)}.renderModule`,
      ),
      renderModuleSha256: requiredString(
        entry.renderModuleSha256,
        `${String(entry.id)}.renderModuleSha256`,
      ),
      components: strings(entry.components),
      capabilities: strings(entry.capabilities),
    };
  });
}

async function collectScenarioCatalog(
  fixtureBundleRoot: string,
): Promise<readonly ScenarioCatalogEntry[]> {
  const result: ScenarioCatalogEntry[] = [];
  const seen = new Set<string>();
  for (const entry of await readFixtureEntries(fixtureBundleRoot)) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate UI scenario '${entry.id}'.`);
    }
    seen.add(entry.id);
    const fixture = expectRecord(
      await readJson(path.join(fixtureBundleRoot, entry.file)),
      entry.file,
    );
    const source = expectRecord(fixture.source, `${entry.id}.source`);
    const environment = expectRecord(
      fixture.environment,
      `${entry.id}.environment`,
    );
    const renderModulePath = path.join(fixtureBundleRoot, entry.renderModule);
    const renderDigest = `sha256:${await sha256File(renderModulePath)}`;
    if (renderDigest !== entry.renderModuleSha256) {
      throw new Error(
        `${entry.renderModule} digest does not match the fixture index.`,
      );
    }
    const sourceText = await readFile(renderModulePath, "utf8");
    if (!sourceText.includes("export const uiContractFingerprint")) {
      throw new Error(
        `${entry.renderModule} is missing uiContractFingerprint.`,
      );
    }
    result.push({
      id: entry.id,
      title: requiredString(fixture.title, `${entry.id}.title`),
      gameId: requiredString(fixture.gameId, `${entry.id}.gameId`),
      fixtureUrl: `/fixtures/reference-games/${entry.file}`,
      renderModuleUrl: `/fixtures/reference-games/${entry.renderModule}`,
      renderModule: entry.renderModule,
      components: [...new Set(entry.components)].sort(compareCanonicalStrings),
      capabilities: [...new Set(entry.capabilities)].sort(
        compareCanonicalStrings,
      ),
      viewportTags: [...new Set(strings(environment.viewportTags))].sort(
        compareCanonicalStrings,
      ),
      sourceDigest: requiredString(
        source.sourceDigest,
        `${entry.id}.sourceDigest`,
      ),
    });
  }
  return result.sort((left, right) =>
    compareCanonicalStrings(left.id, right.id),
  );
}

async function renderCatalog(
  entries: readonly ScenarioCatalogEntry[],
  catalogPath: string,
  fixtureBundleRoot: string,
): Promise<string> {
  const rendered = entries
    .map((entry) => {
      const relativeModule = path
        .relative(
          path.dirname(catalogPath),
          path.join(fixtureBundleRoot, entry.renderModule),
        )
        .split(path.sep)
        .join("/");
      const moduleSpecifier = relativeModule.startsWith(".")
        ? relativeModule
        : `./${relativeModule}`;
      return `{
  id: ${JSON.stringify(entry.id)},
  title: ${JSON.stringify(entry.title)},
  gameId: ${JSON.stringify(entry.gameId)},
  fixtureUrl: ${JSON.stringify(entry.fixtureUrl)},
  renderModuleUrl: ${JSON.stringify(entry.renderModuleUrl)},
  renderModuleLoader: () => import(${JSON.stringify(moduleSpecifier)}),
  components: ${JSON.stringify(entry.components)},
  capabilities: ${JSON.stringify(entry.capabilities)},
  viewportTags: ${JSON.stringify(entry.viewportTags)},
  sourceDigest: ${JSON.stringify(entry.sourceDigest)},
}`;
    })
    .join(",\n");
  return prettier.format(
    `// Generated by scripts/ui/catalog.ts. Do not edit.
export const scenarios = Object.freeze([${rendered}]);
`,
    { parser: "typescript" },
  );
}

export interface GeneratedScenarioCatalog {
  readonly scenarioCount: number;
  readonly catalogPath: string;
  readonly digest: string;
}

export async function generateScenarioCatalog(
  generatedRoot: string,
): Promise<GeneratedScenarioCatalog> {
  const fixtureBundleRoot = path.join(
    generatedRoot,
    "fixtures/reference-games",
  );
  const catalogPath = path.join(generatedRoot, "catalog.ts");
  const entries = await collectScenarioCatalog(fixtureBundleRoot);
  const source = await renderCatalog(entries, catalogPath, fixtureBundleRoot);
  await writeFile(catalogPath, source);
  return {
    scenarioCount: entries.length,
    catalogPath,
    digest: `sha256:${createHash("sha256").update(source).digest("hex")}`,
  };
}
