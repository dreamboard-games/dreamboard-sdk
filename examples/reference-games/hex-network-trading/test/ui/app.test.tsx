import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("Stormtrail UI binds every canonical phase through typed surfaces", () => {
  const app = read("../../ui/App.tsx");
  const routes = read("../../ui/interaction-routes.tsx");
  assert.match(app, /UI\.defineSurfaces\(\{\s*frontier: Board\.surface\("frontier"\)/);
  assert.match(app, /<Board\.HexGrid/);
  assert.match(app, /data-reference-game="hex-network-trading"/);
  assert.match(app, />Stormtrail</);
  assert.match(routes, /satisfies InteractionRoutes/);
  for (const interaction of [
    "setupCamp.placeStartingCamp",
    "setupTrail.placeStartingTrail",
    "roll.rollDice",
    "discardBarrier.discardSupplies",
    "moveBandits.moveBandits",
    "main.buildTrail",
    "main.buildCamp",
    "main.tradeWithSupplyDepot",
    "main.offerTrade",
    "main.endTurn",
    "pendingTrade.acceptTrade",
    "pendingTrade.rejectTrade",
  ]) {
    assert.equal(routes.includes(`"${interaction}"`), true, interaction);
  }
  assert.doesNotMatch(app + routes, /charter|town|port trade|moveStorm/i);
});
