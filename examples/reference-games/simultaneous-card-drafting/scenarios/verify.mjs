import assert from "node:assert/strict";
import { referenceGame } from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "simultaneous-card-drafting");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.ok(referenceGame.interactions.some((item) => item.id === "lock-choice"));
assert.ok(
  referenceGame.interactions.some((item) => item.id === "reveal-and-pass"),
);
assert.ok(coverage.uiPatterns.includes("compact-mobile-hand"));
console.log(`${referenceGame.id}: scenario coverage verified`);
