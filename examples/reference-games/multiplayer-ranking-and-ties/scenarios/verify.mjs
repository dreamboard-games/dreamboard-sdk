import assert from "node:assert/strict";
import {
  activePlayerId,
  cardById,
  createInitialState,
  draftStall,
  harborDeck,
  legalMarketCardIds,
  maxRounds,
  referenceGame,
  scenarioMetadata,
  scoreFestivalRow,
  stallCards,
  stormCards,
  validateDraft,
} from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

function component(id, label, value) {
  return { id, label, value };
}

function standing({
  playerId,
  rank,
  result,
  score,
  prestige,
  guildSets,
  coins,
  completeSets,
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

function assertCanonicalOutcome(outcome, playerIds) {
  const legacyWinnerKey = `winner${"Player"}Id`;
  const legacyScoreMapKey = `final${"Scores"}`;
  assert.equal(typeof outcome.reason.code, "string");
  assert.ok(outcome.reason.code.length > 0);
  assert.equal(outcome[legacyWinnerKey], undefined);
  assert.equal(outcome[legacyScoreMapKey], undefined);
  assert.equal(outcome.reason[legacyWinnerKey], undefined);
  assert.equal(outcome.reason[legacyScoreMapKey], undefined);
  assert.equal(outcome.standings.length, playerIds.length);
  assert.deepEqual(
    [...outcome.standings].map((row) => row.playerId).sort(),
    [...playerIds].sort(),
  );

  const seenPlayers = new Set();
  for (const row of outcome.standings) {
    assert.ok(playerIds.includes(row.playerId));
    assert.equal(seenPlayers.has(row.playerId), false);
    seenPlayers.add(row.playerId);
    assert.equal(Number.isInteger(row.rank), true);
    assert.ok(row.rank > 0);
    assert.ok(["win", "draw", "loss", "eliminated"].includes(row.result));
    if (row.score !== undefined) {
      assert.equal(Number.isFinite(row.score), true);
      const componentIds = row.scoreBreakdown.map((item) => item.id);
      assert.equal(new Set(componentIds).size, componentIds.length);
      assert.deepEqual(componentIds, [
        "stall-prestige",
        "guild-sets",
        "coin-bonus",
      ]);
      for (const item of row.scoreBreakdown) {
        assert.equal(Number.isFinite(item.value), true);
        assert.ok(item.label.length > 0);
      }
      const tieBreakIds = row.tieBreaks.map((item) => item.id);
      assert.equal(new Set(tieBreakIds).size, tieBreakIds.length);
      assert.deepEqual(tieBreakIds, ["complete-sets", "coins"]);
      for (const item of row.tieBreaks) {
        assert.equal(Number.isFinite(item.value), true);
        assert.ok(item.label.length > 0);
      }
    } else {
      assert.equal(row.scoreBreakdown, undefined);
      assert.equal(row.tieBreaks, undefined);
    }
  }
}

const expectedUniqueWinnerOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    standing({
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 26,
      prestige: 15,
      guildSets: 8,
      coins: 3,
      completeSets: 2,
    }),
    standing({
      playerId: "player-2",
      rank: 2,
      result: "loss",
      score: 20,
      prestige: 9,
      guildSets: 8,
      coins: 3,
      completeSets: 2,
    }),
    standing({
      playerId: "player-3",
      rank: 3,
      result: "loss",
      score: 18,
      prestige: 13,
      guildSets: 4,
      coins: 1,
      completeSets: 1,
    }),
    standing({
      playerId: "player-4",
      rank: 4,
      result: "loss",
      score: 16,
      prestige: 9,
      guildSets: 4,
      coins: 3,
      completeSets: 1,
    }),
  ],
};

const expectedTrueTieOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    standing({
      playerId: "player-1",
      rank: 1,
      result: "draw",
      score: 22,
      prestige: 12,
      guildSets: 8,
      coins: 2,
      completeSets: 2,
    }),
    standing({
      playerId: "player-2",
      rank: 1,
      result: "draw",
      score: 22,
      prestige: 12,
      guildSets: 8,
      coins: 2,
      completeSets: 2,
    }),
  ],
};

const expectedCompleteSetTieBreakOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    standing({
      playerId: "player-3",
      rank: 1,
      result: "win",
      score: 21,
      prestige: 9,
      guildSets: 8,
      coins: 4,
      completeSets: 2,
    }),
    standing({
      playerId: "player-2",
      rank: 2,
      result: "loss",
      score: 21,
      prestige: 14,
      guildSets: 4,
      coins: 3,
      completeSets: 1,
    }),
    standing({
      playerId: "player-1",
      rank: 3,
      result: "loss",
      score: 20,
      prestige: 12,
      guildSets: 8,
      coins: 0,
      completeSets: 2,
    }),
  ],
};

const expectedCoinTieBreakOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    standing({
      playerId: "player-3",
      rank: 1,
      result: "win",
      score: 21,
      prestige: 9,
      guildSets: 8,
      coins: 4,
      completeSets: 2,
    }),
    standing({
      playerId: "player-1",
      rank: 2,
      result: "loss",
      score: 19,
      prestige: 12,
      guildSets: 4,
      coins: 3,
      completeSets: 1,
    }),
    standing({
      playerId: "player-2",
      rank: 3,
      result: "loss",
      score: 19,
      prestige: 15,
      guildSets: 4,
      coins: 0,
      completeSets: 1,
    }),
  ],
};

const expectedNonFirstTieOutcome = {
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    standing({
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 13,
      prestige: 9,
      guildSets: 4,
      coins: 0,
      completeSets: 1,
    }),
    standing({
      playerId: "player-2",
      rank: 2,
      result: "loss",
      score: 11,
      prestige: 6,
      guildSets: 4,
      coins: 1,
      completeSets: 1,
    }),
    standing({
      playerId: "player-3",
      rank: 2,
      result: "loss",
      score: 11,
      prestige: 6,
      guildSets: 4,
      coins: 1,
      completeSets: 1,
    }),
    standing({
      playerId: "player-4",
      rank: 4,
      result: "loss",
      score: 4,
      prestige: 2,
      guildSets: 0,
      coins: 2,
      completeSets: 0,
    }),
  ],
};

const expectedCancellationOutcome = {
  reason: {
    code: "FESTIVAL_CANCELLED",
    message: "A second storm cancelled the harbor fair before scoring.",
  },
  standings: [
    { playerId: "player-1", rank: 1, result: "draw" },
    { playerId: "player-2", rank: 1, result: "draw" },
  ],
};

assert.equal(referenceGame.id, "multiplayer-ranking-and-ties");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.equal(referenceGame.rulesBrief, "Harbor Fair");
assert.equal(referenceGame.guidance.phase.label, "Draft a stall");
assert.equal(referenceGame.guidance.setup.steps.length, 2);
assert.equal(
  referenceGame.interactions.find((item) => item.id === "draft-stall").help,
  "Choose one face-up stall card. Final ties break by complete guild sets, then coins.",
);
assert.equal(referenceGame.players.min, 2);
assert.equal(referenceGame.players.max, 4);
assert.equal(referenceGame.loop.rounds, maxRounds);
assert.equal(referenceGame.loop.marketSize, 4);
assert.equal(referenceGame.loop.stormLimit, 2);
assert.equal(stallCards.length, 30);
assert.equal(stormCards.length, 2);
assert.equal(harborDeck.length, 32);
assert.deepEqual(Object.keys(coverage.scenarios), [
  "initial",
  "uniqueWinner",
  "trueTie",
  "completeSetTieBreak",
  "coinTieBreak",
  "nonFirstTie",
  "scorelessCancellation",
]);
assert.ok(
  coverage.assertions.includes(
    "terminal scenarios assert reason standings score breakdowns and tie-break evidence",
  ),
);
assert.ok(referenceGame.interactions.some((item) => item.id === "draft-stall"));

const initialState = scenarioMetadata.initial.state;
assert.equal(initialState.phase, "draft");
assert.equal(initialState.round, 1);
assert.equal(initialState.market.length, 4);
assert.equal(activePlayerId(initialState), "player-1");
assert.deepEqual(
  legalMarketCardIds(initialState),
  coverage.replay.eligibleCardIds,
);
assert.equal(cardById[coverage.replay.cardId].kind, "stall");

assert.equal(
  draftStall(initialState, {
    playerId: "player-2",
    cardId: coverage.replay.cardId,
  }).validation.errorCode,
  "PLAYER_NOT_ACTIVE",
);
assert.equal(
  validateDraft(initialState, {
    playerId: "player-1",
    cardId: "storm-1",
  }).errorCode,
  "CARD_NOT_AVAILABLE",
);

assert.deepEqual(
  scoreFestivalRow(["food-p3-c0-1", "craft-p2-c1-1", "music-p1-c1-1"]),
  {
    prestige: 6,
    guildSetPoints: 4,
    coins: 2,
    completeSets: 1,
    total: 12,
    guildCounts: { food: 1, craft: 1, music: 1 },
  },
);

assertCanonicalOutcome(scenarioMetadata.uniqueWinner.outcome, [
  "player-1",
  "player-2",
  "player-3",
  "player-4",
]);
assert.deepEqual(
  scenarioMetadata.uniqueWinner.outcome,
  expectedUniqueWinnerOutcome,
);
assert.equal(scenarioMetadata.uniqueWinner.state.completed, true);
assert.equal(scenarioMetadata.uniqueWinner.state.round, 6);

assertCanonicalOutcome(scenarioMetadata.trueTie.outcome, [
  "player-1",
  "player-2",
]);
assert.deepEqual(scenarioMetadata.trueTie.outcome, expectedTrueTieOutcome);
assert.deepEqual(
  scenarioMetadata.trueTie.outcome.standings.map((row) => row.rank),
  [1, 1],
);

assertCanonicalOutcome(scenarioMetadata.completeSetTieBreak.outcome, [
  "player-1",
  "player-2",
  "player-3",
]);
assert.deepEqual(
  scenarioMetadata.completeSetTieBreak.outcome,
  expectedCompleteSetTieBreakOutcome,
);
assert.equal(
  scenarioMetadata.completeSetTieBreak.outcome.standings[0].score,
  scenarioMetadata.completeSetTieBreak.outcome.standings[1].score,
);
assert.equal(
  scenarioMetadata.completeSetTieBreak.outcome.standings[0].tieBreaks[0].value >
    scenarioMetadata.completeSetTieBreak.outcome.standings[1].tieBreaks[0]
      .value,
  true,
);

assertCanonicalOutcome(scenarioMetadata.coinTieBreak.outcome, [
  "player-1",
  "player-2",
  "player-3",
]);
assert.deepEqual(
  scenarioMetadata.coinTieBreak.outcome,
  expectedCoinTieBreakOutcome,
);
assert.equal(
  scenarioMetadata.coinTieBreak.outcome.standings[1].score,
  scenarioMetadata.coinTieBreak.outcome.standings[2].score,
);
assert.equal(
  scenarioMetadata.coinTieBreak.outcome.standings[1].tieBreaks[0].value,
  scenarioMetadata.coinTieBreak.outcome.standings[2].tieBreaks[0].value,
);
assert.equal(
  scenarioMetadata.coinTieBreak.outcome.standings[1].tieBreaks[1].value >
    scenarioMetadata.coinTieBreak.outcome.standings[2].tieBreaks[1].value,
  true,
);

assertCanonicalOutcome(scenarioMetadata.nonFirstTie.outcome, [
  "player-1",
  "player-2",
  "player-3",
  "player-4",
]);
assert.deepEqual(
  scenarioMetadata.nonFirstTie.outcome,
  expectedNonFirstTieOutcome,
);
assert.deepEqual(
  scenarioMetadata.nonFirstTie.outcome.standings.map((row) => row.rank),
  [1, 2, 2, 4],
);
assert.deepEqual(
  scenarioMetadata.nonFirstTie.outcome.standings
    .filter((row) => row.rank === 2)
    .map((row) => row.result),
  ["loss", "loss"],
);

assertCanonicalOutcome(scenarioMetadata.scorelessCancellation.outcome, [
  "player-1",
  "player-2",
]);
assert.deepEqual(
  scenarioMetadata.scorelessCancellation.outcome,
  expectedCancellationOutcome,
);
assert.equal(scenarioMetadata.scorelessCancellation.state.stormsRevealed, 2);
assert.deepEqual(
  scenarioMetadata.scorelessCancellation.state.events
    .filter((event) => event.kind === "storm-revealed")
    .map((event) => event.stormId),
  ["storm-1", "storm-2"],
);
for (const row of scenarioMetadata.scorelessCancellation.outcome.standings) {
  assert.equal("score" in row, false);
  assert.equal("scoreBreakdown" in row, false);
  assert.equal("tieBreaks" in row, false);
}

assert.throws(
  () => createInitialState({ playerIds: ["player-1"] }),
  /two to four/,
);
assert.throws(
  () => createInitialState({ playerIds: ["player-1", "player-1"] }),
  /unique/,
);

console.log(`${referenceGame.id}: Harbor Fair outcome scenarios verified`);
