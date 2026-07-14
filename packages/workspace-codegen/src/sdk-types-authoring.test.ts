import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "bun:test";
import ts from "typescript";

const fixtureRoot = path.join(import.meta.dir, "__fixtures__", "sdk-types");
const workspaceCodegenRoot = path.resolve(import.meta.dir, "..");

const FIXTURE_FILES: readonly string[] = readdirSync(fixtureRoot)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => path.join(fixtureRoot, name));

const COMPILER_OPTIONS: ts.CompilerOptions = {
  noEmit: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
};

const DIAGNOSTIC_FORMAT_HOST: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => workspaceCodegenRoot,
  getNewLine: () => "\n",
};

/**
 * Shared TypeScript program covering every fixture file. Building one program
 * per test process lets us reuse the parsed lib + SDK declaration graph across
 * ~40 fixtures instead of spawning a cold `tsc --noEmit` per case
 * (previously ~4s per spawn, ~120s total).
 */
let cachedProgram: ts.Program | null = null;
function getProgram(): ts.Program {
  if (!cachedProgram) {
    cachedProgram = ts.createProgram({
      rootNames: [...FIXTURE_FILES],
      options: COMPILER_OPTIONS,
    });
  }
  return cachedProgram;
}

function fixtureFilePath(fileName: string): string {
  return path.join(fixtureRoot, fileName);
}

function getDiagnosticsForFixture(fileName: string): ts.Diagnostic[] {
  const program = getProgram();
  const targetPath = fixtureFilePath(fileName);
  const sourceFile = program.getSourceFile(targetPath);
  if (!sourceFile) {
    throw new Error(
      `Fixture not loaded into shared program: ${targetPath}. Ensure the file exists and is included in FIXTURE_FILES.`,
    );
  }
  return [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
  ];
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, DIAGNOSTIC_FORMAT_HOST);
}

function expectFixtureTypechecks(fileName: string): void {
  const diagnostics = getDiagnosticsForFixture(fileName);
  if (diagnostics.length > 0) {
    throw new Error(
      `Typecheck failed for ${fileName}\n${formatDiagnostics(diagnostics)}`,
    );
  }
}

function expectTypecheckFailure(
  fileName: string,
  expectedSnippets: readonly string[],
): void {
  const diagnostics = getDiagnosticsForFixture(fileName);
  const output = formatDiagnostics(diagnostics);

  expect(diagnostics.length).toBeGreaterThan(0);
  for (const snippet of expectedSnippets) {
    expect(output).toContain(snippet);
  }
}

test("defineTopologyManifest accepts valid typed references", () => {
  expectFixtureTypechecks("valid-manifest.ts");
});

test("defineTopologyManifest accepts valid player-scoped seed homes with ownerId", () => {
  expectFixtureTypechecks("valid-player-scoped-seed-homes.ts");
});

test("defineTopologyManifest accepts omitted boardTemplates", () => {
  expectFixtureTypechecks("valid-manifest-omits-board-templates.ts");
});

test("defineTopologyManifest accepts die types that omit sides", () => {
  expectFixtureTypechecks("valid-die-type-omits-sides.ts");
});

test("defineTopologyManifest rejects invalid typed references", () => {
  expectTypecheckFailure("invalid-manifest.ts", [
    "Type '\"discard\"' is not assignable to type '\"draw\"'",
    "Type '\"missing-card-set\"' is not assignable to type '\"main\"'",
    "Type '\"space-b\"' is not assignable to type '\"space-a\"'",
    'Type \'"missing-slot"\' is not assignable to type \'"worker-rest" | "staging"\'',
    "Type '\"draft\"' is not assignable to type '\"standard\"'",
  ]);
});

test("defineTopologyManifest rejects invalid strict slot host ids", () => {
  expectTypecheckFailure("invalid-slot-host-manifest.ts", [
    "Type '\"missing-host\"' is not assignable to type '\"mat-alpha\"'",
  ]);
});

test("defineTopologyManifest rejects invalid strict slot ids", () => {
  expectTypecheckFailure("invalid-slot-id-manifest.ts", [
    "Type '\"missing-slot\"' is not assignable to type '\"staging\"'",
  ]);
});

test("defineTopologyManifest rejects missing required card properties", () => {
  expectTypecheckFailure("invalid-card-properties-missing-required.ts", [
    "Property 'value' is missing",
  ]);
});

test("defineTopologyManifest rejects extra card property keys", () => {
  expectTypecheckFailure("invalid-card-properties-extra-key.ts", [
    "'unexpected' does not exist in type",
  ]);
});

test("defineTopologyManifest rejects wrong card scalar property values", () => {
  expectTypecheckFailure("invalid-card-properties-wrong-scalar.ts", [
    "Type 'string' is not assignable to type 'number'",
  ]);
});

test("defineTopologyManifest rejects wrong card enum values", () => {
  expectTypecheckFailure("invalid-card-properties-wrong-enum.ts", [
    'Type \'"stars"\' is not assignable to type \'"sun" | "moon"\'',
  ]);
});

test("defineTopologyManifest rejects wrong nested card property values", () => {
  expectTypecheckFailure("invalid-card-properties-wrong-nested.ts", [
    "Type 'number' is not assignable to type 'string'",
  ]);
});

test("defineTopologyManifest rejects wrong piece scalar field values", () => {
  expectTypecheckFailure("invalid-piece-fields-wrong-scalar.ts", [
    "Type 'string' is not assignable to type 'number'",
  ]);
});

test("defineTopologyManifest rejects wrong piece enum field values", () => {
  expectTypecheckFailure("invalid-piece-fields-wrong-enum.ts", [
    'Type \'"resting"\' is not assignable to type \'"ready" | "spent"\'',
  ]);
});

test("defineTopologyManifest rejects wrong piece card id references", () => {
  expectTypecheckFailure("invalid-piece-fields-wrong-card-id.ts", [
    "Type '\"missing-card\"' is not assignable to type '\"ace\"'",
  ]);
});

test("defineTopologyManifest rejects wrong piece zone id references", () => {
  expectTypecheckFailure("invalid-piece-fields-wrong-zone-id.ts", [
    "Type '\"discard\"' is not assignable to type '\"draw\"'",
  ]);
});

test("defineTopologyManifest rejects extra piece field keys", () => {
  expectTypecheckFailure("invalid-piece-fields-extra-key.ts", [
    "'extra' does not exist in type",
  ]);
});

test("defineTopologyManifest rejects per-player space homes without ownerId", () => {
  expectTypecheckFailure("invalid-piece-home-per-player-space-no-owner.ts", [
    "Property 'ownerId' is missing",
    '"player-grid"',
  ]);
});

test("defineTopologyManifest rejects per-player container homes without ownerId", () => {
  expectTypecheckFailure(
    "invalid-piece-home-per-player-container-no-owner.ts",
    ["Property 'ownerId' is missing", '"player-grid"'],
  );
});

test("defineTopologyManifest rejects per-player edge homes without ownerId", () => {
  expectTypecheckFailure("invalid-piece-home-per-player-edge-no-owner.ts", [
    "Property 'ownerId' is missing",
    '"player-grid"',
  ]);
});

test("defineTopologyManifest rejects per-player vertex homes without ownerId", () => {
  expectTypecheckFailure("invalid-piece-home-per-player-vertex-no-owner.ts", [
    "Property 'ownerId' is missing",
    '"player-grid"',
  ]);
});

test("defineTopologyManifest rejects piece seeds with unknown type ids", () => {
  expectTypecheckFailure("invalid-piece-seed-type-id.ts", [
    "Type '\"missing-meeple\"' is not assignable to type '\"meeple\"'",
  ]);
});

test("defineTopologyManifest rejects wrong die player id references", () => {
  expectTypecheckFailure("invalid-die-fields-wrong-player-id.ts", [
    `Type '"player-3"' is not assignable to type`,
  ]);
});

test("defineTopologyManifest rejects wrong die resource id references", () => {
  expectTypecheckFailure("invalid-die-fields-wrong-resource-id.ts", [
    "Type '\"missing-resource\"' is not assignable to type '\"supply\"'",
  ]);
});

test("defineTopologyManifest rejects wrong die array item values", () => {
  expectTypecheckFailure("invalid-die-fields-wrong-array-item.ts", [
    "Type 'string' is not assignable to type 'number'",
  ]);
});

test("defineTopologyManifest rejects die seeds with unknown type ids", () => {
  expectTypecheckFailure("invalid-die-seed-type-id.ts", [
    "Type '\"missing-d6\"' is not assignable to type '\"d6\"'",
  ]);
});

test("defineTopologyManifest rejects per-player zone homes without ownerId", () => {
  expectTypecheckFailure("invalid-die-home-per-player-zone-no-owner.ts", [
    "Property 'ownerId' is missing",
    '"main-hand"',
  ]);
});

test("defineTopologyManifest rejects invalid board container card-set references", () => {
  expectTypecheckFailure("invalid-container-card-set-manifest.ts", [
    "Type '\"missing-card-set\"' is not assignable to type '\"main\"'",
  ]);
});

test("defineTopologyManifest rejects edge ids in generic board field schemas", () => {
  expectTypecheckFailure("invalid-generic-board-edge-id.ts", [
    "not assignable to type 'never'",
  ]);
});

test("defineTopologyManifest rejects invalid nested generic board fields", () => {
  expectTypecheckFailure("invalid-generic-board-nested-field.ts", [
    "Type 'number' is not assignable to type 'string'",
  ]);
});

test("defineTopologyManifest rejects wrong square-board space ids in board fields", () => {
  expectTypecheckFailure("invalid-square-board-space-id.ts", [
    "missing-space",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong square-board edge ids in board fields", () => {
  expectTypecheckFailure("invalid-square-board-edge-id.ts", [
    "square-edge:missing",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong square-board vertex ids in board fields", () => {
  expectTypecheckFailure("invalid-square-board-vertex-id.ts", [
    "square-vertex:9,9",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects extra square-template space field keys", () => {
  expectTypecheckFailure("invalid-square-space-fields-extra-key.ts", [
    "'extra' does not exist in type",
  ]);
});

test("defineTopologyManifest rejects wrong square-template space field enums", () => {
  expectTypecheckFailure("invalid-square-space-fields-enum.ts", [
    'Type \'"lava"\' is not assignable to type \'"grass" | "water"\'',
  ]);
});

test("defineTopologyManifest rejects wrong square relation space ids", () => {
  expectTypecheckFailure("invalid-square-relation-space-id.ts", [
    "missing-space",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong square relation field scalars", () => {
  expectTypecheckFailure("invalid-square-relation-field-scalar.ts", [
    "Type 'string' is not assignable to type 'number'",
  ]);
});

test("defineTopologyManifest rejects wrong square container host space ids", () => {
  expectTypecheckFailure("invalid-square-container-host-space-id.ts", [
    "missing-space",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong square container field space ids", () => {
  expectTypecheckFailure("invalid-square-container-field-space-id.ts", [
    "missing-space",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong hex edge ids in edge fields", () => {
  expectTypecheckFailure("invalid-hex-edge-field-edge-id.ts", [
    "hex-edge:missing",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects wrong hex vertex ids in vertex fields", () => {
  expectTypecheckFailure("invalid-hex-vertex-field-vertex-id.ts", [
    "hex-vertex:missing",
    "not assignable to type",
  ]);
});

test("defineTopologyManifest rejects invalid card visibility player ids", () => {
  expectTypecheckFailure("invalid-card-visibility.ts", [
    `Type '"player-3"' is not assignable to type`,
  ]);
});

test("defineTopologyManifest rejects invalid piece visibility player ids", () => {
  expectTypecheckFailure("invalid-piece-visibility.ts", [
    `Type '"player-3"' is not assignable to type`,
  ]);
});

test("defineTopologyManifest rejects invalid die visibility player ids", () => {
  expectTypecheckFailure("invalid-die-visibility.ts", [
    `Type '"player-3"' is not assignable to type`,
  ]);
});
