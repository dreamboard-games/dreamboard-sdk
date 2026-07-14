#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "../ui/reference-games-lib.mjs";
import {
  digestUIScenarioFixture,
  parseUIScenarioFixture,
  parseUIScenarioFixtureBundleIndex,
} from "../../packages/sdk/dist/testing.js";

const defaultFixturesRoot = path.join(
  root,
  "build/ui-workbench/generated/fixtures/reference-games",
);

function sha256Buffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertRenderModuleExternalized(relativePath, source) {
  const forbidden = [
    "node_modules/@dreamboard-games/sdk",
    "node_modules/react",
    "../packages/sdk",
    "../../packages/sdk",
    "react.production.min",
    "__SECRET_INTERNALS_DO_NOT_USE",
  ];
  for (const token of forbidden) {
    if (source.includes(token)) {
      throw new Error(`${relativePath} appears to bundle ${token}`);
    }
  }
  if (!source.includes("export const uiContractFingerprint")) {
    throw new Error(`${relativePath} is missing uiContractFingerprint.`);
  }
  if (source.includes("export { Root } from ")) {
    return;
  }
  if (!source.includes('from "react"')) {
    throw new Error(`${relativePath} must externalize React with an import.`);
  }
  if (
    !source.includes('from "@dreamboard-games/sdk/runtime"') &&
    !source.includes('from "@dreamboard-games/sdk/runtime/primitives"')
  ) {
    throw new Error(
      `${relativePath} must externalize the SDK runtime with an import.`,
    );
  }
  if (
    !source.includes('from "@dreamboard-games/sdk/plugin-runtime-contract"')
  ) {
    throw new Error(
      `${relativePath} must externalize the plugin runtime contract with an import.`,
    );
  }
}

export async function checkReferenceFixtures({
  fixturesRoot = defaultFixturesRoot,
} = {}) {
  const resolvedFixturesRoot = path.resolve(fixturesRoot);
  const bundle = parseUIScenarioFixtureBundleIndex(
    await readJson(path.join(resolvedFixturesRoot, "index.json")),
  );
  const seenFiles = new Set();
  for (const entry of bundle.fixtures) {
    if (seenFiles.has(entry.file)) {
      throw new Error(`Duplicate fixture file '${entry.file}'.`);
    }
    seenFiles.add(entry.file);

    const fixturePath = path.join(resolvedFixturesRoot, entry.file);
    const fixture = parseUIScenarioFixture(await readJson(fixturePath));
    if (fixture.id !== entry.id) {
      throw new Error(
        `${entry.file} id '${fixture.id}' does not match index id '${entry.id}'.`,
      );
    }
    const fixtureDigest = digestUIScenarioFixture(fixture);
    if (fixtureDigest !== entry.sha256) {
      throw new Error(
        `${entry.file} digest ${fixtureDigest} does not match index ${entry.sha256}.`,
      );
    }
    if (fixture.source.renderModule !== entry.renderModule) {
      throw new Error(
        `${entry.file} render module does not match index entry.`,
      );
    }
    if (fixture.source.renderModuleDigest !== entry.renderModuleSha256) {
      throw new Error(
        `${entry.file} render module digest does not match index entry.`,
      );
    }

    const moduleRelative = entry.renderModule;
    const modulePath = path.join(resolvedFixturesRoot, moduleRelative);
    const moduleBytes = await readFile(modulePath);
    const moduleDigest = sha256Buffer(moduleBytes);
    if (moduleDigest !== entry.renderModuleSha256) {
      throw new Error(
        `${moduleRelative} digest ${moduleDigest} does not match index ${entry.renderModuleSha256}.`,
      );
    }
    assertRenderModuleExternalized(
      moduleRelative,
      moduleBytes.toString("utf8"),
    );
  }
  return { fixtureCount: bundle.fixtures.length };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      options.fixturesRoot = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${argv[index]}'.`);
  }
  return options;
}

async function main() {
  const result = await checkReferenceFixtures(parseArgs(process.argv.slice(2)));
  console.log(`checked ${result.fixtureCount} UI fixtures`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
