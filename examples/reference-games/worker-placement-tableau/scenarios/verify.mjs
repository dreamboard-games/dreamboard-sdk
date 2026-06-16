import assert from "node:assert/strict";
import { referenceGame } from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "worker-placement-tableau");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.equal(referenceGame.workers.available, 3);
assert.ok(
  referenceGame.interactions.some((item) => item.id === "allocate-resources"),
);
assert.ok(coverage.uiPatterns.includes("confirmation-dialog"));
console.log(`${referenceGame.id}: scenario coverage verified`);
