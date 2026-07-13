import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import { festivalCardIds, stallCards } from "../app/cards.ts";
import game from "../app/game.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import draftActionability from "./scenarios/draft-actionability.scenario.ts";
import projectionPrivacy from "./scenarios/projection-privacy.scenario.ts";
import rankingCoin from "./scenarios/ranking-and-ties-coin.scenario.ts";
import rankingGuildSet from "./scenarios/ranking-and-ties-guild-set.scenario.ts";
import rankingLowerPlace from "./scenarios/ranking-and-ties-lower-place.scenario.ts";
import rankingTrueFirst from "./scenarios/ranking-and-ties-true-first.scenario.ts";
import rankingUniqueWinner from "./scenarios/ranking-and-ties-unique-winner.scenario.ts";
import cancellationFinalRefill from "./scenarios/refill-and-cancellation-final-refill.scenario.ts";
import cancellationInitialFirst from "./scenarios/refill-and-cancellation-initial-first-storm.scenario.ts";
import cancellationInitialSecond from "./scenarios/refill-and-cancellation-initial-second-storm.scenario.ts";
import cancellationOrdinaryFirst from "./scenarios/refill-and-cancellation-ordinary-first-storm.scenario.ts";
import scorelessCancellation from "./scenarios/scoreless-cancellation.scenario.ts";
import supportedTwo from "./scenarios/supported-player-count-2.scenario.ts";
import supportedThree from "./scenarios/supported-player-count-3.scenario.ts";
import supportedFour from "./scenarios/supported-player-count-4.scenario.ts";

const scenarios = [
  completeGame,
  supportedTwo,
  supportedThree,
  supportedFour,
  cancellationInitialFirst,
  cancellationInitialSecond,
  cancellationOrdinaryFirst,
  cancellationFinalRefill,
  draftActionability,
  rankingUniqueWinner,
  rankingGuildSet,
  rankingCoin,
  rankingTrueFirst,
  rankingLowerPlace,
  scorelessCancellation,
  projectionPrivacy,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

function identity(suffix: string) {
  return {
    id: completeGame.id,
    path: "test/scenarios/complete-game.scenario.ts",
    sourceDigest: `sha256:harbor-fair-${suffix}` as const,
  };
}

test("ordinary setup performs one 32-card seeded shuffle and hides its order", async () => {
  const [replay, player, spectator] = await Promise.all([
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity("setup-player"),
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity("setup-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);

  const state = replay.state();
  const accountedCards = [
    ...state.publicState.market.filter(
      (cardId): cardId is NonNullable<typeof cardId> => cardId !== null,
    ),
    ...state.publicState.stormHistory,
    ...state.hiddenState.festivalDeck,
  ];
  assert.deepEqual([...accountedCards].sort(), [...festivalCardIds].sort());
  assert.equal(player.node.entropy.draws.length, 31);
  assert.equal(
    player.node.entropy.draws.every(
      (draw, index) =>
        draw.operation.kind === "integer" &&
        draw.operation.parameters.minInclusive === 0 &&
        draw.operation.parameters.maxInclusive === 31 - index,
    ),
    true,
  );
  assert.equal(JSON.stringify(player.node).includes("festivalDeck"), false);
  assert.equal(JSON.stringify(spectator.node).includes("festivalDeck"), false);
});

test("the festival deck has the exact ten-stall recipe for each guild", () => {
  assert.equal(stallCards.length, 30);
  for (const guild of ["food", "craft", "music"] as const) {
    const recipe = stallCards
      .filter((card) => card.guild === guild)
      .reduce<Record<string, number>>((counts, card) => {
        const key = `${card.prestige}:${card.coins}`;
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {});
    assert.deepEqual(recipe, {
      "1:1": 2,
      "2:0": 4,
      "2:1": 2,
      "3:0": 2,
    });
  }
});

test("inspect derives active-only drafting actions and no scheduler blockers", async () => {
  const inspections = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(`opening-seat-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "setup" as const, completed: 0 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity("opening-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);
  const [seatZero, ...others] = inspections;
  assert.ok(seatZero);
  assert.deepEqual(seatZero.node.flow.activeActors, [
    { seat: 0, playerId: "player-1" },
  ]);
  assert.deepEqual(seatZero.node.flow.pendingActors, []);
  assert.deepEqual(seatZero.node.flow.continuationWaiters, []);
  assert.deepEqual(seatZero.node.flow.blockedBy, []);
  assert.deepEqual(
    seatZero.node.actions.map(({ interactionId }) => interactionId),
    ["draftStall"],
  );
  assert.equal(seatZero.node.actions[0]?.inputs[0]?.eligibleCount, 4);
  assert.equal(
    others.every(({ node }) => node.actions.length === 0),
    true,
  );
});

test("explore emits exactly the four current-market commands", async () => {
  const explored = await exploreScenario({
    game,
    scenario: completeGame,
    identity: identity("opening-explore"),
    perspective: { kind: "player", seat: 0 },
    at: { segment: "setup", completed: 0 },
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.deepEqual(
    explored.candidates.map(({ command }) => command.params.stallId).sort(),
    ["craft-p2-c1-1", "craft-p3-c0-2", "food-p3-c0-1", "music-p2-c0-2"],
  );
  assert.equal(
    explored.candidates.every(
      ({ after }) =>
        after.flow.phase === "drafting" && after.flow.blockedBy.length === 0,
    ),
    true,
  );
});

test("post-refill and mid-game inspections stay public, actor-correct, and blocker-free", async () => {
  const afterRefill = await inspectScenario({
    game,
    scenario: completeGame,
    identity: identity("after-refill"),
    perspective: { kind: "player", seat: 1 },
    at: { segment: "given", completed: 1 },
  });
  assert.deepEqual(afterRefill.node.flow.activeActors, [
    { seat: 1, playerId: "player-2" },
  ]);
  assert.deepEqual(afterRefill.node.flow.pendingActors, []);
  assert.deepEqual(afterRefill.node.flow.blockedBy, []);
  assert.deepEqual(
    afterRefill.node.actions.map(({ interactionId }) => interactionId),
    ["draftStall"],
  );
  assert.equal(
    (
      afterRefill.node.publicState as { events: Array<{ kind: string }> }
    ).events.at(-1)?.kind,
    "market-refilled",
  );

  const midGame = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(`mid-game-seat-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "given" as const, completed: 12 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity("mid-game-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 12 },
    }),
  ]);
  const [first, ...rest] = midGame;
  assert.ok(first);
  for (const inspected of rest) {
    assert.deepEqual(inspected.node.publicState, first.node.publicState);
    assert.equal(
      JSON.stringify(inspected.node).includes("festivalDeck"),
      false,
    );
  }
});

test("normal complete replay is byte-stable and every score equals its components", async () => {
  const [first, second] = await Promise.all([
    replayScenario({ game, scenario: completeGame }),
    replayScenario({ game, scenario: completeGame }),
  ]);
  assert.deepEqual(first.state(), second.state());
  assert.deepEqual(first.diagnostics.events, second.diagnostics.events);
  const standings = first.state().publicState.outcome?.standings ?? [];
  for (const standing of standings) {
    assert.equal(
      standing.scoreBreakdown?.reduce(
        (sum, component) => sum + component.value,
        0,
      ),
      standing.score,
    );
    assert.deepEqual(
      standing.tieBreaks?.map(({ id }) => id),
      ["complete-guild-sets", "coins"],
    );
  }
});
