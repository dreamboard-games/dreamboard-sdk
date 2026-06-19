import assert from "node:assert/strict";
import type { HarborOutcome } from "../../app/game-contract.ts";
import type { PlayerId } from "../../shared/manifest-contract.ts";

export function component(id: string, label: string, value: number) {
  return { id, label, value };
}

export function standing({
  playerId,
  rank,
  result,
  score,
  prestige,
  guildSets,
  coins,
  completeSets,
}: {
  playerId: PlayerId;
  rank: number;
  result: "win" | "draw" | "loss";
  score: number;
  prestige: number;
  guildSets: number;
  coins: number;
  completeSets: number;
}) {
  return {
    playerId,
    rank,
    result,
    score,
    scoreBreakdown: [
      component("stall-prestige", "Stall prestige", prestige),
      component("guild-sets", "Guild sets", guildSets),
      component("coin-bonus", "Coins", coins),
    ],
    tieBreaks: [
      component("complete-sets", "Complete sets", completeSets),
      component("coins", "Coins", coins),
    ],
  };
}

export function assertCanonicalOutcome(
  outcome: HarborOutcome,
  playerIds: readonly PlayerId[],
) {
  const legacyWinnerKey = `winner${"Player"}Id`;
  const legacyScoreMapKey = `final${"Scores"}`;
  assert.equal(typeof outcome.reason.code, "string");
  assert.ok(outcome.reason.code.length > 0);
  assert.equal(
    (outcome as Record<string, unknown>)[legacyWinnerKey],
    undefined,
  );
  assert.equal(
    (outcome as Record<string, unknown>)[legacyScoreMapKey],
    undefined,
  );
  assert.equal(
    (outcome.reason as Record<string, unknown>)[legacyWinnerKey],
    undefined,
  );
  assert.equal(
    (outcome.reason as Record<string, unknown>)[legacyScoreMapKey],
    undefined,
  );
  assert.equal(outcome.standings.length, playerIds.length);
  assert.deepEqual(
    [...outcome.standings].map((row) => row.playerId).sort(),
    [...playerIds].sort(),
  );

  const seenPlayers = new Set<PlayerId>();
  for (const row of outcome.standings) {
    assert.ok(playerIds.includes(row.playerId));
    assert.equal(seenPlayers.has(row.playerId), false);
    seenPlayers.add(row.playerId);
    assert.equal(Number.isInteger(row.rank), true);
    assert.ok(row.rank > 0);
    assert.ok(["win", "draw", "loss", "eliminated"].includes(row.result));
    if (row.score !== undefined) {
      assert.equal(Number.isFinite(row.score), true);
      const componentIds = row.scoreBreakdown?.map((item) => item.id);
      assert.deepEqual(componentIds, [
        "stall-prestige",
        "guild-sets",
        "coin-bonus",
      ]);
      const tieBreakIds = row.tieBreaks?.map((item) => item.id);
      assert.deepEqual(tieBreakIds, ["complete-sets", "coins"]);
    } else {
      assert.equal(row.scoreBreakdown, undefined);
      assert.equal(row.tieBreaks, undefined);
    }
  }
}
