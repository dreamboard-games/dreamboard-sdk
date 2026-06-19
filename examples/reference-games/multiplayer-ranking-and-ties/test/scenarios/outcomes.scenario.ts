import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayerId } from "../../shared/manifest-contract.ts";
import { scenarioMetadata } from "../../app/phases/scenarios.ts";
import { assertCanonicalOutcome, standing } from "./assertions.ts";

const p = (playerId: string) => playerId as PlayerId;

test("unique winner outcome preserves complete ranked evidence", () => {
  const outcome = scenarioMetadata.uniqueWinner.state.outcome!;
  assertCanonicalOutcome(outcome, [
    p("player-1"),
    p("player-2"),
    p("player-3"),
    p("player-4"),
  ]);
  assert.deepEqual(outcome, {
    reason: { code: "SIX_ROUNDS_COMPLETE" },
    standings: [
      standing({
        playerId: p("player-1"),
        rank: 1,
        result: "win",
        score: 26,
        prestige: 15,
        guildSets: 8,
        coins: 3,
        completeSets: 2,
      }),
      standing({
        playerId: p("player-2"),
        rank: 2,
        result: "loss",
        score: 20,
        prestige: 9,
        guildSets: 8,
        coins: 3,
        completeSets: 2,
      }),
      standing({
        playerId: p("player-3"),
        rank: 3,
        result: "loss",
        score: 18,
        prestige: 13,
        guildSets: 4,
        coins: 1,
        completeSets: 1,
      }),
      standing({
        playerId: p("player-4"),
        rank: 4,
        result: "loss",
        score: 16,
        prestige: 9,
        guildSets: 4,
        coins: 3,
        completeSets: 1,
      }),
    ],
  });
});

test("true tie keeps equal first-place players at rank one", () => {
  const outcome = scenarioMetadata.trueTie.state.outcome!;
  assertCanonicalOutcome(outcome, [p("player-1"), p("player-2")]);
  assert.deepEqual(
    outcome.standings.map((row) => row.rank),
    [1, 1],
  );
  assert.deepEqual(
    outcome.standings.map((row) => row.result),
    ["draw", "draw"],
  );
});

test("complete-set and coin tie-break evidence are explicit", () => {
  const completeSets = scenarioMetadata.completeSetTieBreak.state.outcome!;
  assertCanonicalOutcome(completeSets, [
    p("player-1"),
    p("player-2"),
    p("player-3"),
  ]);
  assert.equal(
    completeSets.standings[0]!.score,
    completeSets.standings[1]!.score,
  );
  assert.equal(
    completeSets.standings[0]!.tieBreaks![0]!.value >
      completeSets.standings[1]!.tieBreaks![0]!.value,
    true,
  );

  const coins = scenarioMetadata.coinTieBreak.state.outcome!;
  assertCanonicalOutcome(coins, [p("player-1"), p("player-2"), p("player-3")]);
  assert.equal(coins.standings[1]!.score, coins.standings[2]!.score);
  assert.equal(
    coins.standings[1]!.tieBreaks![0]!.value,
    coins.standings[2]!.tieBreaks![0]!.value,
  );
  assert.equal(
    coins.standings[1]!.tieBreaks![1]!.value >
      coins.standings[2]!.tieBreaks![1]!.value,
    true,
  );
});

test("non-first tie keeps tied lower-place players at the same rank", () => {
  const outcome = scenarioMetadata.nonFirstTie.outcome;
  assertCanonicalOutcome(outcome, [
    p("player-1"),
    p("player-2"),
    p("player-3"),
    p("player-4"),
  ]);
  assert.deepEqual(
    outcome.standings.map((row) => row.rank),
    [1, 2, 2, 4],
  );
  assert.deepEqual(
    outcome.standings.filter((row) => row.rank === 2).map((row) => row.result),
    ["loss", "loss"],
  );
});
