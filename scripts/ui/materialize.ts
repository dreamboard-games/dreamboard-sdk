import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { checkReferenceFixtures } from "../ui-fixtures/check-fixtures.ts";
import { compileReferenceFixtures } from "../ui-fixtures/compile-reference-fixtures.ts";
import { materializeReferenceGameWorkspaces } from "../ui-fixtures/workspace/materialize-workspaces.ts";
import { generateScenarioCatalog } from "./catalog.ts";
import {
  replaceDirectoryAtomically,
  withMaterializationLock,
} from "./materialization.ts";
import {
  compareCanonicalStrings,
  expectRecord,
  readJson,
  root,
} from "./support.ts";

export const defaultGeneratedWorkbenchRoot = path.join(
  root,
  "build/ui-workbench/generated",
);

export const defaultSmokeScenarioIds = Object.freeze([
  "hearts.dealt-hand.desktop",
  "roll-and-write-scorecard.mark-cell.mobile",
] as const);

export interface MaterializeWorkbenchOptions {
  readonly outputRoot?: string;
  readonly gameIds?: readonly string[];
  readonly lockPath?: string;
}

export interface WorkbenchMaterialization {
  readonly generatedRoot: string;
  readonly fixtureCount: number;
  readonly scenarioCount: number;
  readonly digest: string;
}

export async function publishWorkbenchProduct<T>(
  outputRoot: string,
  producer: (temporaryRoot: string) => Promise<T>,
): Promise<T> {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-workbench-materialization-"),
  );
  try {
    const result = await producer(temporaryRoot);
    await replaceDirectoryAtomically(temporaryRoot, outputRoot);
    return result;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function materializeWorkbench({
  outputRoot = defaultGeneratedWorkbenchRoot,
  gameIds = [],
  lockPath,
}: MaterializeWorkbenchOptions = {}): Promise<WorkbenchMaterialization> {
  const resolvedOutputRoot = path.resolve(outputRoot);
  return withMaterializationLock(
    () =>
      publishWorkbenchProduct(resolvedOutputRoot, async (temporaryRoot) => {
        const referenceGameIds = gameIds.filter((id) => id !== "ui-scenarios");
        if (gameIds.length === 0 || referenceGameIds.length > 0) {
          await materializeReferenceGameWorkspaces(referenceGameIds);
        }
        const fixtureRoot = path.join(
          temporaryRoot,
          "fixtures/reference-games",
        );
        const fixtures = await compileReferenceFixtures({
          outputRoot: fixtureRoot,
          gameIds,
        });
        await checkReferenceFixtures({ fixturesRoot: fixtureRoot });
        const catalog = await generateScenarioCatalog(temporaryRoot);
        if (gameIds.length === 0) {
          const available = await readScenarioIds(fixtureRoot);
          const missing = defaultSmokeScenarioIds.filter(
            (id) => !available.includes(id),
          );
          if (missing.length > 0) {
            throw new Error(
              `Default UI smoke scenario${missing.length === 1 ? " is" : "s are"} missing: ${missing.join(", ")}.`,
            );
          }
        }
        return {
          generatedRoot: resolvedOutputRoot,
          fixtureCount: fixtures.fixtureCount,
          scenarioCount: catalog.scenarioCount,
          digest: await digestDirectory(temporaryRoot),
        };
      }),
    { lockPath },
  );
}

export async function readScenarioIds(
  fixtureRoot = path.join(
    defaultGeneratedWorkbenchRoot,
    "fixtures/reference-games",
  ),
): Promise<readonly string[]> {
  const bundle = expectRecord(
    await readJson(path.join(fixtureRoot, "index.json")),
    "UI fixture index",
  );
  if (!Array.isArray(bundle.fixtures)) {
    throw new Error("UI fixture index must contain fixtures.");
  }
  return bundle.fixtures
    .map((value, index) => {
      const entry = expectRecord(value, `UI fixture ${index}`);
      if (typeof entry.id !== "string") {
        throw new Error(`UI fixture ${index}.id must be a string.`);
      }
      return entry.id;
    })
    .sort(compareCanonicalStrings);
}

async function digestDirectory(directory: string): Promise<string> {
  const records: Array<readonly [string, string]> = [];
  async function visit(current: string): Promise<void> {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort(
      (left, right) => compareCanonicalStrings(left.name, right.name),
    )) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        records.push([
          path.relative(directory, absolute).split(path.sep).join("/"),
          createHash("sha256")
            .update(await readFile(absolute))
            .digest("hex"),
        ]);
      }
    }
  }
  await visit(directory);
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(records))
    .digest("hex")}`;
}
