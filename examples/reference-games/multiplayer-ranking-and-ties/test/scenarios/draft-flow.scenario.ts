import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardId, PlayerId } from "../../shared/manifest-contract.ts";
import {
  activePlayerId,
  cardById,
  draftStall,
  legalMarketCardIds,
  scoreFestivalRow,
  stallCards,
  stormCards,
} from "../../app/phases/draft-flow.ts";
import { scenarioMetadata } from "../../app/phases/scenarios.ts";

test("draft flow exposes four legal market stalls and advances seat order", () => {
  const state = scenarioMetadata.initial.state;

  assert.equal(state.round, 1);
  assert.equal(state.market.length, 4);
  assert.equal(activePlayerId(state), "player-1");
  assert.deepEqual(legalMarketCardIds(state), [
    "food-p3-c0-1",
    "food-p3-c0-2",
    "craft-p2-c1-1",
    "craft-p2-c1-2",
  ]);
  assert.equal(cardById["food-p3-c0-1" as CardId].kind, "stall");

  const wrongPlayer = draftStall(state, {
    playerId: "player-2" as PlayerId,
    cardId: "food-p3-c0-1" as CardId,
  });
  assert.equal(wrongPlayer.validation.ok, false);
  assert.equal(
    wrongPlayer.validation.ok ? null : wrongPlayer.validation.errorCode,
    "PLAYER_NOT_ACTIVE",
  );

  const accepted = draftStall(state, {
    playerId: "player-1" as PlayerId,
    cardId: "food-p3-c0-1" as CardId,
  });
  assert.equal(accepted.accepted, true);
  assert.equal(activePlayerId(accepted.state), "player-2");
  assert.deepEqual(accepted.state.festivalRows["player-1" as PlayerId], [
    "food-p3-c0-1",
  ]);
});

test("card inventory and scoring match the Harbor Fair rules", () => {
  assert.equal(stallCards.length, 30);
  assert.equal(stormCards.length, 2);
  assert.deepEqual(
    scoreFestivalRow([
      "food-p3-c0-1",
      "craft-p2-c1-1",
      "music-p1-c1-1",
    ] as CardId[]),
    {
      prestige: 6,
      guildSetPoints: 4,
      coins: 2,
      completeSets: 1,
      total: 12,
      guildCounts: { food: 1, craft: 1, music: 1 },
    },
  );
});
