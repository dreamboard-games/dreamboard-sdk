import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import allHearts from "./scenarios/card-legality-all-hearts.scenario.ts";
import firstLead from "./scenarios/card-legality-first-lead.scenario.ts";
import allPenalty from "./scenarios/card-legality-first-trick-all-penalty.scenario.ts";
import firstPenalty from "./scenarios/card-legality-first-trick-penalty.scenario.ts";
import followSuit from "./scenarios/card-legality-follow-suit.scenario.ts";
import heartsNotBroken from "./scenarios/card-legality-hearts-not-broken.scenario.ts";
import offSuit from "./scenarios/card-legality-off-suit.scenario.ts";
import stale from "./scenarios/card-legality-stale.scenario.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import projectionPrivacy from "./scenarios/projection-privacy.scenario.ts";
import lowerPlace from "./scenarios/scoring-and-outcome-lower-place.scenario.ts";
import ordinaryPenalty from "./scenarios/scoring-and-outcome-ordinary-penalty.scenario.ts";
import shootTheMoon from "./scenarios/scoring-and-outcome-shoot-the-moon.scenario.ts";
import soleWinner from "./scenarios/scoring-and-outcome-sole-winner.scenario.ts";
import tiedLowest from "./scenarios/scoring-and-outcome-tied-lowest.scenario.ts";
import setupAndPass from "./scenarios/setup-and-pass.scenario.ts";
import trickResolution from "./scenarios/trick-resolution.scenario.ts";
import { play, submit } from "./scenario-paths.ts";

const scenarios = [
  completeGame,
  setupAndPass,
  firstLead,
  followSuit,
  firstPenalty,
  allPenalty,
  offSuit,
  heartsNotBroken,
  allHearts,
  stale,
  trickResolution,
  ordinaryPenalty,
  shootTheMoon,
  soleWinner,
  tiedLowest,
  lowerPlace,
  projectionPrivacy,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

function identity(scenario: { readonly id: string }, suffix: string) {
  return {
    id: scenario.id,
    path: `test/scenarios/${scenario.id}.${suffix}.scenario.ts`,
    sourceDigest: `sha256:hearts-${suffix}` as const,
  };
}

function seatsOf(actors: readonly { readonly seat: number }[]) {
  return actors.map(({ seat }) => seat);
}

async function exploreCardIds(options: {
  scenario: (typeof scenarios)[number];
  seat: number;
  at:
    | { segment: "given"; completed: number }
    | { segment: "when"; completed: number };
  suffix: string;
}) {
  const explored = await exploreScenario({
    game,
    scenario: options.scenario,
    identity: identity(options.scenario, options.suffix),
    perspective: { kind: "player", seat: options.seat },
    at: options.at,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return [];
  assert.equal(
    explored.candidates.every(
      ({ command }) => command.interactionId === "playCard",
    ),
    true,
  );
  return explored.candidates
    .map(({ command }) => command.params.cardId as string)
    .sort();
}

test("normal setup shuffles once, deals 52 unique private cards round-robin, and exposes no deck order", async () => {
  const inspections = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(completeGame, `opening-seat-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "setup" as const, completed: 0 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity(completeGame, "opening-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);
  const [first, ...rest] = inspections;
  assert.ok(first);
  assert.equal(first.node.entropy.draws.length, 51);
  assert.equal(
    first.node.entropy.draws.every(
      (draw, index) =>
        draw.operation.kind === "integer" &&
        draw.operation.parameters.minInclusive === 0 &&
        draw.operation.parameters.maxInclusive === 51 - index,
    ),
    true,
  );
  const cardIds = inspections
    .slice(0, 4)
    .flatMap(({ node }) =>
      (node.view as { hand: readonly { id: string }[] }).hand.map(
        ({ id }) => id,
      ),
    );
  assert.equal(cardIds.length, 52);
  assert.equal(new Set(cardIds).size, 52);
  assert.deepEqual(
    inspections
      .slice(0, 4)
      .map(
        ({ node }) => (node.view as { hand: readonly unknown[] }).hand.length,
      ),
    [13, 13, 13, 13],
  );
  for (const inspected of rest) {
    assert.deepEqual(inspected.node.publicState, first.node.publicState);
  }
  const spectatorView = inspections[4]!.node.view as Record<string, unknown>;
  assert.equal("hand" in spectatorView, false);
  assert.equal(JSON.stringify(spectatorView).includes("draw-pile"), false);
  assert.equal(JSON.stringify(spectatorView).includes("runtime.rng"), false);
});

test("the sealed pass barrier derives actors, waits, blockers, and perspective actions", async () => {
  const opening = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(completeGame, `pass-opening-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "setup" as const, completed: 0 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity(completeGame, "pass-opening-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);
  assert.deepEqual(seatsOf(opening[0]!.node.flow.activeActors), [0, 1, 2, 3]);
  assert.deepEqual(seatsOf(opening[0]!.node.flow.pendingActors), [0, 1, 2, 3]);
  assert.deepEqual(opening[0]!.node.flow.continuationWaiters, []);
  assert.deepEqual(opening[0]!.node.flow.blockedBy, []);
  assert.deepEqual(
    opening.map(({ node }) => node.actions.map(({ actor }) => actor.seat)),
    [[0], [1], [2], [3], []],
  );
  assert.equal(opening[0]!.node.actions[0]?.interactionId, "submit");
  assert.equal(opening[0]!.node.actions[0]?.inputs[0]?.eligibleCount, 13);

  const partial = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(completeGame, `pass-partial-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "given" as const, completed: 2 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity(completeGame, "pass-partial-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 2 },
    }),
  ]);
  assert.deepEqual(seatsOf(partial[0]!.node.flow.activeActors), [2, 3]);
  assert.deepEqual(seatsOf(partial[0]!.node.flow.pendingActors), [2, 3]);
  assert.deepEqual(seatsOf(partial[0]!.node.flow.continuationWaiters), [0, 1]);
  assert.deepEqual(
    partial[0]!.node.flow.blockedBy.map(({ actor, blockers, source }) => ({
      waiter: actor.seat,
      blockers: seatsOf(blockers),
      source,
    })),
    [
      { waiter: 0, blockers: [2, 3], source: "scheduler" },
      { waiter: 1, blockers: [2, 3], source: "scheduler" },
    ],
  );
  assert.deepEqual(
    partial.map(({ node }) => node.actions.map(({ actor }) => actor.seat)),
    [[], [], [2], [3], []],
  );
  for (const inspected of partial.slice(2)) {
    const serialized = JSON.stringify(inspected.node);
    for (const sealedCardId of [
      "clubs-6",
      "diamonds-10",
      "hearts-10",
      "diamonds-2",
      "spades-3",
      "diamonds-8",
    ]) {
      assert.equal(serialized.includes(sealedCardId), false);
    }
  }
});

test("passing accepts exactly three distinct cards from the actor's original hand", async () => {
  const opening = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "setup", completed: 0 },
  });
  const sourceDigest = opening.checkpointDigest;
  const commands = [
    submit(0, ["clubs-3", "clubs-6"]),
    submit(0, ["clubs-3", "clubs-3", "clubs-6"]),
    submit(0, ["clubs-3", "clubs-6", "clubs-2"]),
  ] as const;
  for (const command of commands) {
    const probed = await probeScenarioCommand({ replay: opening, command });
    assert.equal(probed.kind, "rejected");
  }
  assert.equal(opening.checkpointDigest, sourceDigest);
});

test("explore enumerates legal pass commitments as concrete accepted commands", async () => {
  const explored = await exploreScenario({
    game,
    scenario: completeGame,
    identity: identity(completeGame, "passing-explore"),
    perspective: { kind: "player", seat: 0 },
    at: { segment: "setup", completed: 0 },
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.equal(explored.candidates.length, 50);
  for (const { command, after } of explored.candidates) {
    assert.equal(command.interactionId, "submit");
    const cardIds = command.params.cardIds as string[];
    assert.equal(cardIds.length, 3);
    assert.equal(new Set(cardIds).size, 3);
    assert.equal(after.flow.phase, "passing");
  }
});

test("explore publishes the exact legal card domain for every contextual branch", async () => {
  assert.deepEqual(
    await exploreCardIds({
      scenario: firstLead,
      seat: 1,
      at: { segment: "given", completed: 4 },
      suffix: "domain-first-lead",
    }),
    ["clubs-2"],
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: followSuit,
      seat: 2,
      at: { segment: "given", completed: 5 },
      suffix: "domain-follow-suit",
    }),
    ["clubs-4", "clubs-8", "clubs-A"].sort(),
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: firstPenalty,
      seat: 0,
      at: { segment: "given", completed: 7 },
      suffix: "domain-first-penalty",
    }),
    [
      "diamonds-10",
      "diamonds-6",
      "diamonds-7",
      "diamonds-K",
      "spades-10",
      "spades-A",
    ].sort(),
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: allPenalty,
      seat: 2,
      at: { segment: "given", completed: 6 },
      suffix: "domain-all-penalty",
    }),
    [
      "hearts-10",
      "hearts-2",
      "hearts-3",
      "hearts-4",
      "hearts-5",
      "hearts-6",
      "hearts-7",
      "hearts-8",
      "hearts-9",
      "hearts-A",
      "hearts-J",
      "hearts-Q",
      "spades-Q",
    ].sort(),
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: offSuit,
      seat: 0,
      at: { segment: "given", completed: 21 },
      suffix: "domain-off-suit",
    }),
    [
      "clubs-7",
      "diamonds-4",
      "diamonds-6",
      "diamonds-K",
      "hearts-3",
      "hearts-4",
      "hearts-5",
      "hearts-7",
      "hearts-9",
    ].sort(),
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: heartsNotBroken,
      seat: 2,
      at: { segment: "given", completed: 8 },
      suffix: "domain-hearts-not-broken",
    }),
    [
      "diamonds-2",
      "diamonds-5",
      "diamonds-8",
      "diamonds-J",
      "spades-2",
      "spades-3",
      "spades-4",
      "spades-6",
      "spades-8",
    ].sort(),
  );
  assert.deepEqual(
    await exploreCardIds({
      scenario: allHearts,
      seat: 0,
      at: { segment: "given", completed: 40 },
      suffix: "domain-all-hearts",
    }),
    ["hearts-10", "hearts-3", "hearts-5", "hearts-J"].sort(),
  );
});

test("submission-time validation rejects illegal and stale card commands without mutating checkpoints", async () => {
  const firstLeadReplay = await replayScenario({
    game,
    scenario: firstLead,
    at: { segment: "given", completed: 4 },
  });
  const nonTwo = await probeScenarioCommand({
    replay: firstLeadReplay,
    command: play(1, "clubs-K"),
  });
  assert.equal(nonTwo.kind, "rejected");
  if (nonTwo.kind === "rejected")
    assert.equal(nonTwo.errorCode, "INVALID_CARD_PLAY");

  const followReplay = await replayScenario({
    game,
    scenario: followSuit,
    at: { segment: "given", completed: 5 },
  });
  const offSuitWhileHolding = await probeScenarioCommand({
    replay: followReplay,
    command: play(2, "hearts-2"),
  });
  assert.equal(offSuitWhileHolding.kind, "rejected");

  const penaltyReplay = await replayScenario({
    game,
    scenario: firstPenalty,
    at: { segment: "given", completed: 7 },
  });
  for (const cardId of ["hearts-6", "spades-Q"] as const) {
    const rejected = await probeScenarioCommand({
      replay: penaltyReplay,
      command: play(0, cardId),
    });
    assert.equal(rejected.kind, "rejected");
  }

  const unbrokenReplay = await replayScenario({
    game,
    scenario: heartsNotBroken,
    at: { segment: "given", completed: 8 },
  });
  const heartLead = await probeScenarioCommand({
    replay: unbrokenReplay,
    command: play(2, "hearts-2"),
  });
  assert.equal(heartLead.kind, "rejected");

  const staleReplay = await replayScenario({
    game,
    scenario: stale,
    at: { segment: "given", completed: 8 },
  });
  const staleDigest = staleReplay.checkpointDigest;
  const staleCard = await probeScenarioCommand({
    replay: staleReplay,
    command: play(2, "clubs-A"),
  });
  assert.equal(staleCard.kind, "rejected");
  if (staleCard.kind === "rejected") {
    assert.equal(staleCard.errorCode, "CARD_TARGET_NOT_ELIGIBLE");
  }
  assert.equal(staleReplay.checkpointDigest, staleDigest);
});

test("player and spectator inspections reveal public trick evidence but no opponent hand or sealed pass identity", async () => {
  const partialPass = await Promise.all([
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity: identity(projectionPrivacy, "privacy-pass-player"),
      perspective: { kind: "player", seat: 2 },
      at: { segment: "given", completed: 2 },
    }),
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity: identity(projectionPrivacy, "privacy-pass-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 2 },
    }),
  ]);
  for (const { node } of partialPass) {
    const serialized = JSON.stringify(node);
    assert.equal(serialized.includes("clubs-6"), false);
    assert.equal(serialized.includes("diamonds-10"), false);
    assert.equal(serialized.includes("hearts-10"), false);
  }

  const openTrick = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(completeGame, `privacy-open-trick-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "given" as const, completed: 6 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity(completeGame, "privacy-open-trick-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 6 },
    }),
  ]);
  for (const { node } of openTrick) {
    const publicView = node.view as {
      currentTrickPlays: readonly { playerId: string; cardId: string }[];
    };
    assert.deepEqual(publicView.currentTrickPlays, [
      { playerId: "player-2", cardId: "clubs-2" },
      { playerId: "player-3", cardId: "clubs-A" },
    ]);
  }
  assert.equal(
    "hand" in (openTrick[4]!.node.view as Record<string, unknown>),
    false,
  );

  const midHand = await Promise.all([
    ...[0, 1, 2, 3].map((seat) =>
      inspectScenario({
        game,
        scenario: completeGame,
        identity: identity(completeGame, `privacy-mid-${seat}`),
        perspective: { kind: "player" as const, seat },
        at: { segment: "given" as const, completed: 32 },
      }),
    ),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: identity(completeGame, "privacy-mid-spectator"),
      perspective: { kind: "spectator" },
      at: { segment: "given", completed: 32 },
    }),
  ]);
  const [first, ...others] = midHand;
  assert.ok(first);
  for (const inspected of others) {
    assert.deepEqual(inspected.node.publicState, first.node.publicState);
  }
  assert.equal(
    (first.node.view as { trickHistory: readonly unknown[] }).trickHistory
      .length,
    7,
  );
  assert.equal(
    "hand" in (midHand[4]!.node.view as Record<string, unknown>),
    false,
  );
  assert.equal(
    JSON.stringify(midHand[4]!.node.view).includes("draw-pile"),
    false,
  );
});

test("the final legal card resolves trick thirteen before scoring and terminal publication", async () => {
  const beforeFinal = await inspectScenario({
    game,
    scenario: completeGame,
    identity: identity(completeGame, "before-final"),
    perspective: { kind: "player", seat: 1 },
    at: { segment: "given", completed: 55 },
  });
  assert.equal(beforeFinal.node.flow.phase, "playing");
  assert.deepEqual(seatsOf(beforeFinal.node.flow.activeActors), [1]);
  assert.deepEqual(beforeFinal.node.flow.blockedBy, []);
  assert.equal(beforeFinal.node.actions[0]?.inputs[0]?.eligibleCount, 1);

  const explored = await exploreScenario({
    game,
    scenario: completeGame,
    identity: identity(completeGame, "final-explore"),
    perspective: { kind: "player", seat: 1 },
    at: { segment: "given", completed: 55 },
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.deepEqual(
    explored.candidates.map(({ command }) => command.params.cardId),
    ["clubs-8"],
  );
  assert.equal(explored.candidates[0]?.after.flow.phase, "gameOver");
  assert.deepEqual(explored.candidates[0]?.after.flow.blockedBy, []);
});

test("the canonical full-hand replay is byte-stable", async () => {
  const [first, second] = await Promise.all([
    replayScenario({ game, scenario: completeGame }),
    replayScenario({ game, scenario: completeGame }),
  ]);
  assert.deepEqual(first.state(), second.state());
  assert.deepEqual(first.diagnostics.events, second.diagnostics.events);
  assert.equal(first.checkpointDigest, second.checkpointDigest);
});
