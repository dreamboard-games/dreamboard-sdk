import { expect, test } from "bun:test";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import { generateFrameworkFiles } from "./seeds.js";

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
