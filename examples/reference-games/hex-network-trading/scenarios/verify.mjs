import assert from "node:assert/strict";
import { referenceGame } from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "hex-network-trading");
assert.equal(referenceGame.board.topology, "hex");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.ok(referenceGame.interactions.some((item) => item.id === "offer-trade"));
assert.ok(coverage.uiPatterns.includes("hex-board-targets"));
console.log(`${referenceGame.id}: scenario coverage verified`);
