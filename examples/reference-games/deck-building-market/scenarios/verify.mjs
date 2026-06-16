import assert from "node:assert/strict";
import { referenceGame } from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "deck-building-market");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.ok(referenceGame.zones.market.length >= 4);
assert.ok(referenceGame.interactions.some((item) => item.id === "buy-card"));
assert.ok(coverage.uiPatterns.includes("purchase-selection"));
console.log(`${referenceGame.id}: scenario coverage verified`);
