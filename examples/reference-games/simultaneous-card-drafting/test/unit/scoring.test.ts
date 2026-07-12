import test from "node:test";
import assert from "node:assert/strict";
import { buildOutcome, scoreFamilies } from "../../app/rules/scoring.ts";

test("lanterns score two points each", () => {
  assert.equal(scoreFamilies(["lantern", "lantern", "lantern"]), 6);
});

test("tea cups score complete pairs and ignore leftovers", () => {
  assert.equal(scoreFamilies(["tea-cup", "tea-cup", "tea-cup", "tea-cup"]), 10);
  assert.equal(
    scoreFamilies(["tea-cup", "tea-cup", "tea-cup", "tea-cup", "tea-cup"]),
    10,
  );
});

test("festival banners score complete triples and ignore leftovers", () => {
  assert.equal(
    scoreFamilies([
      "festival-banner",
      "festival-banner",
      "festival-banner",
      "festival-banner",
      "festival-banner",
      "festival-banner",
    ]),
    18,
  );
  assert.equal(
    scoreFamilies([
      "festival-banner",
      "festival-banner",
      "festival-banner",
      "festival-banner",
    ]),
    9,
  );
});

test("families combine without cross-family sets", () => {
  assert.equal(
    scoreFamilies([
      "lantern",
      "tea-cup",
      "tea-cup",
      "festival-banner",
      "festival-banner",
      "festival-banner",
    ]),
    16,
  );
});

test("outcomes sort by score and preserve competition ranks for ties", () => {
  const outcome = buildOutcome(
    { "player-1": 22, "player-2": 22, "player-3": 25 },
    ["player-1", "player-2", "player-3"],
    [],
  );
  assert.deepEqual(
    outcome.standings.map(({ playerId, rank, result }) => ({
      playerId,
      rank,
      result,
    })),
    [
      { playerId: "player-3", rank: 1, result: "win" },
      { playerId: "player-1", rank: 2, result: "loss" },
      { playerId: "player-2", rank: 2, result: "loss" },
    ],
  );
});
