import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), { encoding: "utf8" });

test("Sketchbook UI routes only the eleven canonical interactions", () => {
  const routes = read("../../ui/interaction-routes.tsx");
  const canonical = [
    "playerTurn.brainstorm",
    "playerTurn.studio",
    "playerTurn.gallery",
    "playerTurn.eraser",
    "playerTurn.studioVisit",
    "playerTurn.resolveEraser",
    "playerTurn.resolveStudioVisit",
    "playerTurn.endActionStep",
    "playerTurn.playInspiration",
    "playerTurn.buyCard",
    "playerTurn.endTurn",
  ];
  for (const interaction of canonical) assert.match(routes, new RegExp(interaction));
  assert.doesNotMatch(routes, /playAll|Treasure|Sketchpad|Critic|Open Mic/);
  assert.match(routes, /cardIds: hand\.slot\.card/);
  assert.match(routes, /cardId: market\.slot\.card/);
  assert.match(routes, /satisfies InteractionRoutes/);
});

test("Sketchbook UI renders the exact approved supply and growing deck cycle", () => {
  const surfaces = read("../../ui/surfaces.ts");
  const gameUi = read("../../ui/components/game-ui.tsx");
  for (const zoneId of [
    "supply-doodle",
    "supply-sketch",
    "supply-inkwork",
    "supply-idea",
    "supply-concept",
    "supply-masterpiece",
    "supply-brainstorm",
    "supply-studio",
    "supply-gallery",
    "supply-eraser",
    "supply-studio-visit",
  ]) {
    assert.match(surfaces, new RegExp(zoneId));
  }
  assert.match(gameUi, /<hand\.Hand/);
  assert.match(gameUi, /<surface\.Collection/);
  assert.match(gameUi, /discardCardsByPlayerId/);
  assert.match(gameUi, /inPlayCardsByPlayerId/);
  assert.match(gameUi, /deckCountByPlayerId/);
  assert.doesNotMatch(gameUi, /coins|vpTotals|pendingAction/);
});
