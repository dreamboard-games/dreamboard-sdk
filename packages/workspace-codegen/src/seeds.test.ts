import { expect, test } from "vitest";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import { generateFrameworkFiles, generateSeedFiles } from "./seeds.js";

const MINIMAL_MANIFEST = {
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [],
  boards: [],
} satisfies GameTopologyManifest;

test("generated UI contract does not export the retired browser demo automation protocol", () => {
  const files = generateFrameworkFiles(MINIMAL_MANIFEST);
  const uiContract = files["shared/generated/ui-contract.ts"];

  expect(uiContract).not.toContain("BROWSER_DEMO_AUTOMATION_");
  expect(uiContract).not.toContain("data-dreamboard-operation");
});

test("generated UI contract exposes square grid workspace board surface", () => {
  const files = generateFrameworkFiles(MINIMAL_MANIFEST);
  const uiContract = files["shared/generated/ui-contract.ts"];

  expect(uiContract).toContain("typeof staticBoards.square");
  expect(uiContract).toContain("squareStaticBoards: staticBoards.square");
});

test("generated UI contract is a thin game specialization", () => {
  const uiContract =
    generateFrameworkFiles(MINIMAL_MANIFEST)["shared/generated/ui-contract.ts"];
  const nonblankLines = uiContract
    .split("\n")
    .filter((line) => line.trim().length > 0);

  expect(nonblankLines.length).toBeLessThanOrEqual(250);
  expect(uiContract.match(/createGameUiContract</g)).toHaveLength(1);
  expect(uiContract).not.toContain("createClientParamSchemasByPhase");
  expect(uiContract).not.toContain("type InteractionCollectorKind");
});

test("generated reducer seed uses one staged defineGame surface", () => {
  const files = generateSeedFiles(MINIMAL_MANIFEST);

  expect(Object.keys(files).sort()).toEqual(["app/game.ts", "ui/App.tsx"]);
  expect(files["app/game.ts"]).toContain("export default defineGame(");
  expect(files["app/game.ts"]).toContain('game.phase("setup")');
  expect(files["app/game.ts"]).toContain("setup.define({");
  expect(files["app/game.ts"]).toContain("setup.interaction({");
  expect(files["ui/App.tsx"]).toContain("satisfies InteractionRoutes");

  const appSeed = Object.entries(files)
    .filter(([path]) => path.startsWith("app/"))
    .map(([, content]) => content)
    .join("\n");
  expect(appSeed).not.toContain("defineInteraction<");
  expect(appSeed).not.toContain("definePhase<");
  expect(appSeed).not.toContain("defineStepPhase<");
  expect(appSeed).not.toContain("ReducerGameDefinition<");
  expect(appSeed).not.toContain("createContractAuthoring");
  expect(appSeed).not.toContain("defineGameContract");
});

test("generated framework tsconfigs admit manifest JSON artifacts", () => {
  const files = generateFrameworkFiles(MINIMAL_MANIFEST);

  expect(files["app/tsconfig.framework.json"]).toContain(
    '"resolveJsonModule": true',
  );
  expect(files["app/tsconfig.framework.json"]).toContain(
    '"../shared/manifest-*.json"',
  );
  expect(files["ui/tsconfig.framework.json"]).toContain(
    '"resolveJsonModule": true',
  );
  expect(files["ui/tsconfig.framework.json"]).toContain(
    '"../shared/**/*.json"',
  );
});
