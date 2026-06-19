import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  pathExists,
  readJson,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";

export { root };

export const fixturesRoot = path.join(root, "fixtures/ui/reference-games");
export const catalogOutputPath = path.join(
  root,
  "packages/ui-workbench/src/catalog.ts",
);
export const componentScenarioIndexPath = path.join(
  root,
  "fixtures/ui/component-scenario-index.json",
);

export const knownScenarioCapabilities = new Set([
  "accessibility-scan",
  "click",
  "keyboard",
  "pointer-drag",
  "reduced-motion",
  "touch-drag",
  "desktop-drag",
  "responsive-layout",
  "runtime-draft",
  "runtime-submit",
]);

export function sortUnique(values) {
  return [...new Set(values)].sort();
}

export function repoRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

export function formatList(values) {
  return values.length > 0 ? values.join(", ") : "(none)";
}

export function assertRelativeBundlePath(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a non-empty relative path`);
    return;
  }
  if (path.isAbsolute(value) || value.split(/[\\/]+/).includes("..")) {
    errors.push(
      `${label} must stay inside fixtures/ui/reference-games: ${value}`,
    );
  }
}

export async function readReferenceFixtureBundleIndex() {
  return readJson(path.join(fixturesRoot, "index.json"));
}

export function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function canonicalizeJson(value) {
  if (value === null) {
    return null;
  }
  switch (typeof value) {
    case "boolean":
    case "string":
      return value;
    case "number":
      if (Number.isFinite(value)) {
        return value;
      }
      break;
    case "object": {
      if (Array.isArray(value)) {
        return value.map((item) => canonicalizeJson(item));
      }
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        break;
      }
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, canonicalizeJson(item)]),
      );
    }
  }
  throw new Error(
    `UI fixture values must be deterministic JSON. Received ${typeof value}.`,
  );
}

export function canonicalizeScenarioFixture(fixture) {
  return canonicalizeJson({
    ...fixture,
    tags: [...(fixture.tags ?? [])].sort(),
    environment: {
      ...(fixture.environment ?? {}),
      viewportTags: [...(fixture.environment?.viewportTags ?? [])].sort(),
    },
  });
}

export function digestScenarioFixture(fixture) {
  return sha256Text(
    `${JSON.stringify(canonicalizeScenarioFixture(fixture), null, 2)}\n`,
  );
}

export async function digestRawFile(filePath) {
  return `sha256:${await sha256File(filePath)}`;
}

export function extractRenderModuleFingerprint(source, relativePath, errors) {
  const match = source.match(
    /export\s+const\s+uiContractFingerprint\s*=\s*["']([^"']+)["']/,
  );
  if (!match) {
    errors.push(`${relativePath} is missing exported uiContractFingerprint`);
    return undefined;
  }
  return match[1];
}

export async function collectValidatedScenarioCatalog() {
  const errors = [];
  const bundle = await readReferenceFixtureBundleIndex();
  if (bundle.schemaVersion !== 2) {
    errors.push(
      `fixtures/ui/reference-games/index.json schemaVersion must be 2`,
    );
  }
  if (!Array.isArray(bundle.fixtures)) {
    errors.push(
      `fixtures/ui/reference-games/index.json fixtures must be an array`,
    );
  }
  if (errors.length > 0) {
    throwCatalogError(errors);
  }

  const seenIds = new Set();
  const entries = [];
  for (const entry of bundle.fixtures) {
    if (seenIds.has(entry.id)) {
      errors.push(`duplicate scenario id ${entry.id}`);
      continue;
    }
    seenIds.add(entry.id);

    assertRelativeBundlePath(entry.file, `${entry.id}.file`, errors);
    assertRelativeBundlePath(
      entry.renderModule,
      `${entry.id}.renderModule`,
      errors,
    );

    const fixturePath = path.join(fixturesRoot, entry.file);
    const renderModulePath = path.join(fixturesRoot, entry.renderModule);
    if (!(await pathExists(fixturePath))) {
      errors.push(`${entry.id}: missing ${repoRelative(fixturePath)}`);
      continue;
    }
    if (!(await pathExists(renderModulePath))) {
      errors.push(`${entry.id}: missing ${repoRelative(renderModulePath)}`);
      continue;
    }

    const fixture = await readJson(fixturePath);
    const moduleSource = await readFile(renderModulePath, "utf8");
    const fixtureDigest = digestScenarioFixture(fixture);
    const renderDigest = await digestRawFile(renderModulePath);
    const renderFingerprint = extractRenderModuleFingerprint(
      moduleSource,
      entry.renderModule,
      errors,
    );

    if (fixture.id !== entry.id) {
      errors.push(
        `${entry.file}: fixture id ${JSON.stringify(
          fixture.id,
        )} does not match bundle id ${JSON.stringify(entry.id)}`,
      );
    }
    if (fixture.gameId !== entry.id.split(".")[0]) {
      errors.push(`${entry.file}: gameId does not match scenario id prefix`);
    }
    if (fixture.source?.scenarioId !== entry.id) {
      errors.push(`${entry.file}: source.scenarioId must be ${entry.id}`);
    }
    if (fixture.source?.renderModule !== entry.renderModule) {
      errors.push(
        `${entry.file}: source.renderModule differs from bundle index`,
      );
    }
    if (fixture.source?.renderModuleDigest !== entry.renderModuleSha256) {
      errors.push(
        `${entry.file}: source.renderModuleDigest differs from bundle index`,
      );
    }
    if (fixtureDigest !== entry.sha256) {
      errors.push(
        `${entry.file}: digest ${fixtureDigest} does not match bundle index ${entry.sha256}`,
      );
    }
    if (renderDigest !== entry.renderModuleSha256) {
      errors.push(
        `${entry.renderModule}: digest ${renderDigest} does not match bundle index ${entry.renderModuleSha256}`,
      );
    }
    if (
      renderFingerprint &&
      fixture.source?.uiContractFingerprint !== renderFingerprint
    ) {
      errors.push(
        `${entry.id}: fixture uiContractFingerprint ${fixture.source?.uiContractFingerprint} does not match render module ${renderFingerprint}`,
      );
    }

    const capabilities = sortUnique(entry.capabilities ?? []);
    const unknownCapabilities = capabilities.filter(
      (capability) => !knownScenarioCapabilities.has(capability),
    );
    if (unknownCapabilities.length > 0) {
      errors.push(
        `${entry.id}: unknown capability tags ${formatList(unknownCapabilities)}`,
      );
    }

    entries.push({
      id: entry.id,
      title: fixture.title,
      gameId: fixture.gameId,
      sourceFiles: sortUnique(
        fixture.source?.sourceFiles ?? [
          `examples/reference-games/${fixture.gameId}/reference-game.json`,
          `examples/reference-games/${fixture.gameId}/app/game.ts`,
          `examples/reference-games/${fixture.gameId}/ui/index.tsx`,
        ],
      ),
      fixtureUrl: `/fixtures/reference-games/${entry.file}`,
      renderModuleUrl: `/fixtures/reference-games/${entry.renderModule}`,
      components: sortUnique(entry.components ?? []),
      capabilities,
      viewportTags: sortUnique(fixture.environment?.viewportTags ?? []),
      replayStepKinds: sortUnique(
        (fixture.replay ?? []).map((step) => step.kind ?? step.execute?.kind),
      ),
      replayStepCount: (fixture.replay ?? []).length,
      replayExpectationKeys: sortUnique(
        (fixture.replay ?? []).flatMap((step) => [
          ...Object.keys(step.expect ?? {}),
          ...Object.keys(step.expectedIdentity ?? {}),
        ]),
      ),
      sourceDigest: fixture.source?.sourceDigest,
      fixtureFile: entry.file,
      renderModule: entry.renderModule,
      fixtureDigest,
      renderModuleDigest: renderDigest,
      uiContractFingerprint: fixture.source?.uiContractFingerprint,
      replay: fixture.replay ?? [],
    });
  }

  if (errors.length > 0) {
    throwCatalogError(errors);
  }
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

export function toPublicScenarioEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    gameId: entry.gameId,
    fixtureUrl: entry.fixtureUrl,
    renderModuleUrl: entry.renderModuleUrl,
    components: entry.components,
    capabilities: entry.capabilities,
    viewportTags: entry.viewportTags,
    sourceDigest: entry.sourceDigest,
  };
}

export async function writeGeneratedJson(
  filePath,
  value,
  { check = false } = {},
) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (check) {
    const current = await readFile(filePath, "utf8").catch((error) => {
      if (error?.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (current !== next) {
      throw new Error(
        `${repoRelative(filePath)} is stale. Run pnpm ui:catalog:generate.`,
      );
    }
    return false;
  }
  await writeJson(filePath, value);
  return true;
}

export async function writeGeneratedText(
  filePath,
  next,
  { check = false } = {},
) {
  if (check) {
    const current = await readFile(filePath, "utf8").catch((error) => {
      if (error?.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (current !== next) {
      throw new Error(
        `${repoRelative(filePath)} is stale. Run pnpm ui:catalog:generate.`,
      );
    }
    return false;
  }
  const { mkdir, rename, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(`${filePath}.tmp`, next);
  await rename(`${filePath}.tmp`, filePath);
  return true;
}

export function throwCatalogError(errors) {
  throw new Error(
    `UI scenario catalog generation failed:\n\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}`,
  );
}
