import { expect, test } from "bun:test";
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

  expect(uiContract).toContain(
    "type BoardSquareGridProps as BoardSquareGridPropsGeneric",
  );
  expect(uiContract).toContain("type BoardGridInteractionFilter");
  expect(uiContract).toContain(
    "const squareStaticBoards = staticBoards.square;",
  );
  expect(uiContract).toContain(
    "export type SquareBoardId = keyof typeof squareStaticBoards & string;",
  );
  expect(uiContract).toContain(
    "export type SquareBoardTopology<Id extends SquareBoardId> = (typeof squareStaticBoards)[Id];",
  );
  expect(uiContract).toContain(
    "export type SquareBoardSpaceId<Id extends SquareBoardId> = BoardSpaceIdOf<",
  );
  expect(uiContract).toContain(
    "export type SquareBoardGridProps<Id extends SquareBoardId> = Omit<",
  );
  expect(uiContract).toContain(
    "BoardSquareGridPropsGeneric<SquareBoardTopology<Id>>",
  );
  expect(uiContract).toContain(
    "interactions?: BoardGridInteractionFilter<InteractionKey>;",
  );
  expect(uiContract).toContain("SquareGrid<const Id extends SquareBoardId>(");
  expect(uiContract).toContain("typeof squareStaticBoards");
  expect(uiContract).toContain("squareStaticBoards,");
});

test("generated reducer seeds use bound authoring factories", () => {
  const files = generateSeedFiles(MINIMAL_MANIFEST);

  expect(files["app/authoring.ts"]).toContain("createContractAuthoring");
  expect(files["app/game.ts"]).toContain("authoring.game({");
  expect(files["app/phases/setup.ts"]).toContain("setup.define({");
  expect(files["app/phases/setup.ts"]).toContain("setup.interaction({");

  const appSeed = Object.entries(files)
    .filter(([path]) => path.startsWith("app/"))
    .map(([, content]) => content)
    .join("\n");
  expect(appSeed).not.toContain("defineInteraction<");
  expect(appSeed).not.toContain("definePhase<");
  expect(appSeed).not.toContain("defineStepPhase<");
  expect(appSeed).not.toContain("ReducerGameDefinition<");
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
