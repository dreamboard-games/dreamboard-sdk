#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  commercialMarkDenylist,
  expectedReferenceGameIds,
  knownMechanics,
  knownUiPatterns,
  listReferenceGameDirs,
  pathExists,
  readJson,
  referenceGamesRoot,
  root,
  sha256Directory,
  sha256File,
  walkFiles,
} from "./reference-games-lib.mjs";

const sdkPackage = "@dreamboard-games/sdk";
const exactVersionPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const guidanceStringBounds = {
  label: 80,
  name: 80,
  summary: 220,
  objective: 280,
  description: 280,
  help: 240,
  blockedReason: 240,
};

function fail(errors) {
  throw new Error(
    `Reference game validation failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}

function isUnsafeDependencySpecifier(value) {
  return (
    value.startsWith("workspace:") ||
    value.startsWith("link:") ||
    value.startsWith("file:") ||
    value.includes("../") ||
    value.includes("..\\")
  );
}

function checkArraySubset({ values, allowed, label, errors, gameId }) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${gameId}: ${label} must be a non-empty array`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value)) {
      errors.push(
        `${gameId}: unrecognized ${label} tag ${JSON.stringify(value)}`,
      );
    }
    if (seen.has(value)) {
      errors.push(`${gameId}: duplicated ${label} tag ${value}`);
    }
    seen.add(value);
  }
}

function checkTextField({ value, label, maxLength, errors, gameId }) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${gameId}: ${label} must be a non-empty string`);
    return false;
  }
  if (value !== value.trim()) {
    errors.push(`${gameId}: ${label} must not have leading or trailing space`);
  }
  if (value.length > maxLength) {
    errors.push(
      `${gameId}: ${label} must be ${maxLength} characters or less, received ${value.length}`,
    );
  }
  if (
    /<\/?[A-Za-z][^>]*>/.test(value) ||
    /```|`|\*\*|__|\[[^\]]+\]\([^)]+\)/.test(value) ||
    /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s)/.test(value)
  ) {
    errors.push(`${gameId}: ${label} must not contain raw Markdown or HTML`);
  }
  return true;
}

function checkTextObject({ object, fieldBounds, pathPrefix, errors, gameId }) {
  for (const [field, maxLength] of Object.entries(fieldBounds)) {
    if (object?.[field] !== undefined) {
      checkTextField({
        value: object[field],
        label: `${pathPrefix}.${field}`,
        maxLength,
        errors,
        gameId,
      });
    }
  }
}

async function loadReferenceGameSource({
  srcPath,
  scenarioPath,
  gameId,
  errors,
}) {
  try {
    const source = await readFile(srcPath, "utf8");
    const coverage = await readFile(scenarioPath, "utf8");
    const moduleSource = source
      .replace(
        /import\s+\{\s*DREAMBOARD_SDK_PACKAGE_SET\s*\}\s+from\s+["']@dreamboard-games\/sdk\/package-set["'];/,
        'const DREAMBOARD_SDK_PACKAGE_SET = { sdkVersion: "reference-check" };',
      )
      .replace(
        /import\s+coverage\s+from\s+["']\.\.\/scenarios\/coverage\.json["']\s+with\s+\{\s*type:\s*["']json["']\s*\};/,
        `const coverage = ${coverage};`,
      );
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(
      moduleSource,
      "utf8",
    ).toString("base64")}`;
    const module = await import(moduleUrl);
    if (!module.referenceGame || typeof module.referenceGame !== "object") {
      errors.push(
        `${gameId}: src/reference-game.mjs must export referenceGame`,
      );
      return null;
    }
    return module.referenceGame;
  } catch (error) {
    errors.push(`${gameId}: failed to import src/reference-game.mjs: ${error}`);
    return null;
  }
}

function checkReferenceGuidance({ referenceGame, gameId, errors }) {
  const phase = referenceGame.guidance?.phase;
  if (!phase || typeof phase !== "object") {
    errors.push(`${gameId}: guidance.phase is required`);
  } else {
    checkTextField({
      value: phase.label,
      label: "guidance.phase.label",
      maxLength: guidanceStringBounds.label,
      errors,
      gameId,
    });
    checkTextField({
      value: phase.summary,
      label: "guidance.phase.summary",
      maxLength: guidanceStringBounds.summary,
      errors,
      gameId,
    });
    checkTextObject({
      object: phase,
      fieldBounds: { objective: guidanceStringBounds.objective },
      pathPrefix: "guidance.phase",
      errors,
      gameId,
    });
  }

  const setup = referenceGame.guidance?.setup;
  if (setup !== undefined) {
    checkTextObject({
      object: setup,
      fieldBounds: {
        name: guidanceStringBounds.name,
        summary: guidanceStringBounds.summary,
      },
      pathPrefix: "guidance.setup",
      errors,
      gameId,
    });
    if (!Array.isArray(setup.steps) || setup.steps.length === 0) {
      errors.push(`${gameId}: guidance.setup.steps must be a non-empty array`);
    } else {
      const seenStepIds = new Set();
      for (const [index, step] of setup.steps.entries()) {
        const stepPath = `guidance.setup.steps[${index}]`;
        checkTextField({
          value: step?.id,
          label: `${stepPath}.id`,
          maxLength: guidanceStringBounds.label,
          errors,
          gameId,
        });
        if (seenStepIds.has(step?.id)) {
          errors.push(
            `${gameId}: duplicated setup guidance step id ${step.id}`,
          );
        }
        seenStepIds.add(step?.id);
        checkTextField({
          value: step?.label,
          label: `${stepPath}.label`,
          maxLength: guidanceStringBounds.label,
          errors,
          gameId,
        });
        checkTextObject({
          object: step,
          fieldBounds: { description: guidanceStringBounds.description },
          pathPrefix: stepPath,
          errors,
          gameId,
        });
      }
    }
  }

  if (
    !Array.isArray(referenceGame.interactions) ||
    referenceGame.interactions.length === 0
  ) {
    errors.push(`${gameId}: interactions must be a non-empty array`);
    return;
  }
  const seenInteractionIds = new Set();
  for (const [index, interaction] of referenceGame.interactions.entries()) {
    const interactionPath = `interactions[${index}]`;
    checkTextField({
      value: interaction?.id,
      label: `${interactionPath}.id`,
      maxLength: guidanceStringBounds.label,
      errors,
      gameId,
    });
    if (seenInteractionIds.has(interaction?.id)) {
      errors.push(`${gameId}: duplicated interaction id ${interaction.id}`);
    }
    seenInteractionIds.add(interaction?.id);
    checkTextField({
      value: interaction?.label,
      label: `${interactionPath}.label`,
      maxLength: guidanceStringBounds.label,
      errors,
      gameId,
    });
    checkTextObject({
      object: interaction,
      fieldBounds: {
        help: guidanceStringBounds.help,
        blockedReason: guidanceStringBounds.blockedReason,
      },
      pathPrefix: interactionPath,
      errors,
      gameId,
    });
  }
}

async function checkGeneratedTextPreservation({
  referenceGame,
  gameId,
  scenarioPath,
  errors,
}) {
  const coverage = await readJson(scenarioPath);
  if (!coverage.scenarioId) {
    return;
  }
  const fixturePath = path.join(
    root,
    "fixtures/ui/reference-games",
    `${coverage.scenarioId}.fixture.json`,
  );
  if (!(await pathExists(fixturePath))) {
    errors.push(
      `${gameId}: missing generated fixture for ${coverage.scenarioId}`,
    );
    return;
  }
  const fixture = await readJson(fixturePath);
  const firstFrame = fixture.protocol?.frames?.[0]?.frame;
  if (!firstFrame) {
    errors.push(`${gameId}: ${coverage.scenarioId} fixture has no first frame`);
    return;
  }

  const authoredGuidance = referenceGame.guidance;
  if (authoredGuidance) {
    const generated = firstFrame.guidance;
    if (!generated) {
      errors.push(`${gameId}: ${coverage.scenarioId} fixture lost guidance`);
    } else if (
      generated.phase?.label !== authoredGuidance.phase?.label ||
      generated.phase?.summary !== authoredGuidance.phase?.summary ||
      generated.phase?.objective !== authoredGuidance.phase?.objective ||
      generated.setup?.summary !== authoredGuidance.setup?.summary ||
      generated.setup?.steps?.length !== authoredGuidance.setup?.steps?.length
    ) {
      errors.push(
        `${gameId}: ${coverage.scenarioId} fixture guidance text does not match source`,
      );
    }
  }

  const sourceInteractions = new Map(
    (referenceGame.interactions ?? []).map((interaction) => [
      interaction.id,
      interaction,
    ]),
  );
  for (const descriptor of firstFrame.availableInteractions ?? []) {
    const source = sourceInteractions.get(descriptor.interactionKey);
    if (!source) {
      continue;
    }
    if (descriptor.label !== source.label) {
      errors.push(
        `${gameId}: ${coverage.scenarioId} fixture label for ${source.id} does not match source`,
      );
    }
    if (source.help !== undefined && descriptor.help !== source.help) {
      errors.push(
        `${gameId}: ${coverage.scenarioId} fixture help for ${source.id} does not match source`,
      );
    }
    if (
      source.blockedReason !== undefined &&
      descriptor.availability?.reason !== source.blockedReason
    ) {
      errors.push(
        `${gameId}: ${coverage.scenarioId} fixture blocked reason for ${source.id} does not match source`,
      );
    }
  }
}

function checkDependencies({ packageJson, gameId, errors }) {
  const dependencyGroups = [
    ["dependencies", packageJson.dependencies ?? {}],
    ["devDependencies", packageJson.devDependencies ?? {}],
    ["peerDependencies", packageJson.peerDependencies ?? {}],
    ["optionalDependencies", packageJson.optionalDependencies ?? {}],
  ];
  for (const [groupName, dependencies] of dependencyGroups) {
    for (const [name, version] of Object.entries(dependencies)) {
      if (isUnsafeDependencySpecifier(version)) {
        errors.push(`${gameId}: ${groupName}.${name} uses ${version}`);
      }
      if (name.startsWith("@dreamboard-games/") && name !== sdkPackage) {
        errors.push(
          `${gameId}: ${groupName}.${name} is an internal SDK package`,
        );
      }
    }
  }

  const sdkVersion = packageJson.dependencies?.[sdkPackage];
  if (!sdkVersion) {
    errors.push(`${gameId}: missing dependencies.${sdkPackage}`);
  } else if (!exactVersionPattern.test(sdkVersion)) {
    errors.push(
      `${gameId}: dependencies.${sdkPackage} must be exact, received ${sdkVersion}`,
    );
  }
}

async function checkDemoRelease({ manifest, gameId, gameDir, errors }) {
  if (typeof manifest.publishToDemoGallery !== "boolean") {
    errors.push(`${gameId}: publishToDemoGallery must be a boolean`);
    return;
  }
  if (!manifest.publishToDemoGallery) {
    if (manifest.demoRelease !== undefined) {
      errors.push(`${gameId}: demoRelease requires publishToDemoGallery true`);
    }
    return;
  }

  const demoRelease = manifest.demoRelease;
  if (!demoRelease || typeof demoRelease !== "object") {
    errors.push(`${gameId}: published demo requires demoRelease`);
    return;
  }

  const expectedSourcePath = `${gameId}/demo-workspace`;
  if (demoRelease.sourcePath !== expectedSourcePath) {
    errors.push(
      `${gameId}: demoRelease.sourcePath must be ${expectedSourcePath}`,
    );
  }
  if (!(await pathExists(path.join(referenceGamesRoot, expectedSourcePath)))) {
    errors.push(`${gameId}: missing ${expectedSourcePath}`);
  }

  if (demoRelease.slug !== gameId) {
    errors.push(`${gameId}: demoRelease.slug must match game id`);
  }
  if (
    typeof demoRelease.heroImageUrl !== "string" ||
    !demoRelease.heroImageUrl.startsWith(`/demos/${gameId}/`)
  ) {
    errors.push(
      `${gameId}: demoRelease.heroImageUrl must be under /demos/${gameId}/`,
    );
  }
  if (
    demoRelease.screenshot?.projection !==
    `${gameId}/demo-workspace/ui/index.tsx`
  ) {
    errors.push(
      `${gameId}: demoRelease.screenshot.projection must target demo-workspace/ui/index.tsx`,
    );
  }
  if (
    typeof demoRelease.demoPlayerCount !== "number" ||
    demoRelease.demoPlayerCount < 1
  ) {
    errors.push(`${gameId}: demoRelease.demoPlayerCount must be positive`);
  }
}

async function checkDenylist({ gameId, gameDir, errors }) {
  const files = await walkFiles(gameDir, {
    excludeDirs: new Set(["node_modules", "dist"]),
  });
  for (const relative of files) {
    const lower = (
      await readFile(path.join(gameDir, relative), "utf8")
    ).toLowerCase();
    for (const mark of commercialMarkDenylist) {
      if (lower.includes(mark)) {
        errors.push(
          `${gameId}: ${relative} contains denied commercial mark ${JSON.stringify(mark)}`,
        );
      }
    }
  }
}

async function checkDemoRegistryAbsence({ gameId, errors }) {
  const repoFiles = await walkFiles(root, {
    excludeDirs: new Set([
      ".git",
      ".turbo",
      "build",
      "dist",
      "node_modules",
      "test-results",
    ]),
  });
  const forbiddenSourcePath = `examples/reference-games/${gameId}`;
  const unexpectedFiles = [];
  for (const relative of repoFiles) {
    if (
      relative.startsWith("docs/exec-plans/ui-agent-iteration-workbench/") ||
      relative.startsWith(
        "docs/exec-plans/ui-primitive-coverage-and-agent-loop-hard-cut/",
      ) ||
      relative.startsWith(
        "docs/exec-plans/competition-game-authoring-capability-hard-cut/",
      ) ||
      relative.startsWith(
        "docs/capability-research/competition-game-authoring/",
      ) ||
      relative.startsWith("fixtures/ui/reference-games/") ||
      relative.startsWith("artifacts/ui/") ||
      relative === "fixtures/ui/component-scenario-index.json" ||
      relative === "scripts/ui-fixtures/authority/authority.test.mjs" ||
      relative === "scripts/ui/generate-component-scenario-index.mjs" ||
      relative.startsWith("examples/reference-games/")
    ) {
      continue;
    }
    const text = await readFile(path.join(root, relative), "utf8");
    if (text.includes(forbiddenSourcePath)) {
      unexpectedFiles.push(relative);
    }
  }
  if (unexpectedFiles.length > 0) {
    errors.push(
      `${gameId}: reference game path appears outside reference/docs scope: ${unexpectedFiles.join(", ")}`,
    );
  }
}

async function validateGame(gameId, errors) {
  const gameDir = path.join(referenceGamesRoot, gameId);
  const packagePath = path.join(gameDir, "package.json");
  const lockfilePath = path.join(gameDir, "pnpm-lock.yaml");
  const manifestPath = path.join(gameDir, "reference-game.json");
  const srcPath = path.join(gameDir, "src/reference-game.mjs");
  const scenarioPath = path.join(gameDir, "scenarios/coverage.json");
  const testPath = path.join(gameDir, "scenarios/verify.mjs");

  for (const requiredPath of [
    packagePath,
    lockfilePath,
    manifestPath,
    srcPath,
    scenarioPath,
    testPath,
  ]) {
    if (!(await pathExists(requiredPath))) {
      errors.push(`${gameId}: missing ${path.relative(root, requiredPath)}`);
    }
  }
  if (!(await pathExists(packagePath)) || !(await pathExists(manifestPath))) {
    return;
  }

  const packageJson = await readJson(packagePath);
  const manifest = await readJson(manifestPath);
  if (packageJson.private !== true) {
    errors.push(`${gameId}: package.json must set private true`);
  }
  if (packageJson.name !== `@dreamboard-reference/${gameId}`) {
    errors.push(
      `${gameId}: package name must be @dreamboard-reference/${gameId}`,
    );
  }
  if (packageJson.scripts?.build !== "node src/reference-game.mjs") {
    errors.push(`${gameId}: build script must run node src/reference-game.mjs`);
  }
  if (packageJson.scripts?.test !== "node scenarios/verify.mjs") {
    errors.push(`${gameId}: test script must run node scenarios/verify.mjs`);
  }
  checkDependencies({ packageJson, gameId, errors });
  const referenceGame = await loadReferenceGameSource({
    srcPath,
    scenarioPath,
    gameId,
    errors,
  });
  if (referenceGame) {
    checkReferenceGuidance({ referenceGame, gameId, errors });
    await checkGeneratedTextPreservation({
      referenceGame,
      gameId,
      scenarioPath,
      errors,
    });
  }

  if (manifest.schemaVersion !== 1) {
    errors.push(`${gameId}: manifest schemaVersion must be 1`);
  }
  if (manifest.id !== gameId) {
    errors.push(
      `${gameId}: manifest id mismatch ${JSON.stringify(manifest.id)}`,
    );
  }
  await checkDemoRelease({ manifest, gameId, gameDir, errors });
  checkArraySubset({
    values: manifest.mechanics,
    allowed: knownMechanics,
    label: "mechanics",
    errors,
    gameId,
  });
  checkArraySubset({
    values: manifest.uiPatterns,
    allowed: knownUiPatterns,
    label: "uiPatterns",
    errors,
    gameId,
  });

  const rights = manifest.rights ?? {};
  if (rights.reviewStatus !== "approved") {
    errors.push(`${gameId}: rights.reviewStatus must be approved`);
  }
  if (!rights.reviewedBy || !rights.reviewedAt) {
    errors.push(`${gameId}: rights review metadata is incomplete`);
  }
  if (
    !Array.isArray(rights.thirdPartyMarks) ||
    rights.thirdPartyMarks.length !== 0
  ) {
    errors.push(`${gameId}: rights.thirdPartyMarks must be empty`);
  }
  if (
    manifest.sdk?.dependency !== sdkPackage ||
    manifest.sdk?.versionPolicy !== "exact"
  ) {
    errors.push(`${gameId}: sdk manifest policy must be ${sdkPackage} exact`);
  }

  await checkDenylist({ gameId, gameDir, errors });
  await checkDemoRegistryAbsence({ gameId, errors });

  return {
    id: gameId,
    packageSha256: await sha256File(packagePath),
    lockfileSha256: await sha256File(lockfilePath),
    sourceSha256: await sha256Directory(path.join(gameDir, "src")),
    scenarioSha256: await sha256Directory(path.join(gameDir, "scenarios")),
    manifestSha256: await sha256File(manifestPath),
    sdkDependency: packageJson.dependencies?.[sdkPackage],
  };
}

async function main() {
  const errors = [];
  if (!(await pathExists(referenceGamesRoot))) {
    fail([`missing ${path.relative(root, referenceGamesRoot)}`]);
  }
  const dirs = await listReferenceGameDirs();
  const infrastructureDirs = new Set(["shared"]);
  const gameDirs = dirs.filter((id) => !infrastructureDirs.has(id));
  const unexpected = gameDirs.filter(
    (id) => !expectedReferenceGameIds.includes(id),
  );
  const missing = expectedReferenceGameIds.filter(
    (id) => !gameDirs.includes(id),
  );
  if (unexpected.length > 0) {
    errors.push(
      `unexpected reference game directories: ${unexpected.join(", ")}`,
    );
  }
  if (missing.length > 0) {
    errors.push(`missing reference game directories: ${missing.join(", ")}`);
  }
  if (new Set(gameDirs).size !== gameDirs.length) {
    errors.push("duplicated reference game IDs");
  }

  const receipts = [];
  for (const gameId of expectedReferenceGameIds) {
    if (gameDirs.includes(gameId)) {
      const receipt = await validateGame(gameId, errors);
      if (receipt) {
        receipts.push(receipt);
      }
    }
  }
  if (errors.length > 0) {
    fail(errors);
  }

  console.log(
    JSON.stringify(
      {
        status: "passed",
        checkedAt: new Date().toISOString(),
        referenceGames: receipts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
