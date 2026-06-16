import assert from "node:assert/strict";
import { referenceGame } from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "hearts");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.ok(referenceGame.sdkPackageSetVersion);
assert.ok(referenceGame.interactions.some((item) => item.id === "pass-three"));
assert.ok(coverage.uiPatterns.includes("mobile-hand-actions"));
console.log(`${referenceGame.id}: scenario coverage verified`);
