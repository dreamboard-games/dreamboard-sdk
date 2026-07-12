import test from "node:test";
import assert from "node:assert/strict";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import { defineScenario } from "./testing-types.ts";
import {
  EDGE_IDS,
  FRONTIER,
  INTERSECTION_IDS,
  INTERSECTIONS_BY_HEX_ID,
} from "../app/model.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import discardBarrier from "./scenarios/discard-barrier.scenario.ts";
import bilateralTrade, {
  affordableTradePrefix,
} from "./scenarios/bilateral-trade.scenario.ts";
import banditsScenario from "./scenarios/bandits.scenario.ts";
import projectionPrivacy from "./scenarios/projection-privacy.scenario.ts";
import topologyAndSetup from "./scenarios/topology-and-setup.scenario.ts";
import productionScenario from "./scenarios/production.scenario.ts";
import depotTrades, {
  depotReadyPrefix,
} from "./scenarios/depot-trades.scenario.ts";
import networkAndCosts from "./scenarios/network-and-costs.scenario.ts";
import {
  DISCARD_BARRIER_PREFIX_COMMANDS,
  discard,
  accept,
  end,
  offer,
  roll,
  STANDARD_SETUP_COMMANDS,
  BANDITS_PREFIX_COMMANDS,
  bandits,
  camp,
  trail,
  PRODUCTION_COMMANDS,
  depot,
  NETWORK_EXHAUSTION_COMMANDS,
  INTERRUPTION_SETUP_COMMANDS,
} from "./scenario-commands.ts";

const scenarios = [
  completeGame,
  discardBarrier,
  bilateralTrade,
  banditsScenario,
  projectionPrivacy,
  topologyAndSetup,
  productionScenario,
  depotTrades,
  networkAndCosts,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

const discardIdentity = {
  id: discardBarrier.id,
  path: "test/scenarios/discard-barrier.scenario.ts",
  sourceDigest: "sha256:stormtrail-discard-barrier",
} as const;

test("discard barrier actors and blockers are scheduler-derived", async () => {
  const before = await Promise.all(
    [0, 1, 2].map((seat) =>
      inspectScenario({
        game,
        scenario: discardBarrier,
        identity: discardIdentity,
        perspective: { kind: "player", seat },
        at: {
          segment: "given",
          completed: DISCARD_BARRIER_PREFIX_COMMANDS.length,
        },
      }),
    ),
  );
  assert.deepEqual(
    before[0]?.node.flow.activeActors.map(({ seat }) => seat),
    [0, 1],
  );
  assert.deepEqual(
    before[0]?.node.flow.pendingActors.map(({ seat }) => seat),
    [0, 1],
  );
  assert.deepEqual(
    before[0]?.node.flow.continuationWaiters.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(
    before[0]?.node.flow.blockedBy.map(({ actor, blockers }) => ({
      waiter: actor.seat,
      blockers: blockers.map(({ seat }) => seat),
    })),
    [{ waiter: 0, blockers: [1] }],
  );
  assert.deepEqual(
    before.map(({ node }) =>
      node.actions.map(({ actor, interactionId }) => ({
        seat: actor.seat,
        interactionId,
      })),
    ),
    [
      [{ seat: 0, interactionId: "discardSupplies" }],
      [{ seat: 1, interactionId: "discardSupplies" }],
      [],
    ],
  );
  assert.deepEqual(
    (before[0]!.node.view as { mySupplies: unknown }).mySupplies,
    { brick: 6, provisions: 0, timber: 2 },
  );
  assert.deepEqual(
    (before[1]!.node.view as { mySupplies: unknown }).mySupplies,
    { brick: 3, provisions: 6, timber: 0 },
  );

  const afterFirst = await Promise.all(
    [0, 1, 2].map((seat) =>
      inspectScenario({
        game,
        scenario: discardBarrier,
        identity: discardIdentity,
        perspective: { kind: "player", seat },
        at: { segment: "when", completed: 1 },
      }),
    ),
  );
  assert.deepEqual(
    afterFirst[0]?.node.flow.activeActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(
    afterFirst[0]?.node.flow.pendingActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(afterFirst[0]?.node.flow.continuationWaiters, []);
  assert.deepEqual(afterFirst[0]?.node.flow.blockedBy, []);
  assert.deepEqual(
    afterFirst.map(({ node }) =>
      node.actions.map(({ actor, interactionId }) => ({
        seat: actor.seat,
        interactionId,
      })),
    ),
    [[{ seat: 0, interactionId: "discardSupplies" }], [], []],
  );
  assert.equal(
    (afterFirst[0]!.node.view as { myLastDiscard: unknown }).myLastDiscard,
    null,
  );
  assert.deepEqual(
    (afterFirst[1]!.node.view as { myLastDiscard: unknown }).myLastDiscard,
    { brick: 1, provisions: 3 },
  );

  const afterBarrier = await inspectScenario({
    game,
    scenario: discardBarrier,
    identity: discardIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "when", completed: 2 },
  });
  assert.equal(afterBarrier.node.flow.phase, "moveBandits");
  assert.deepEqual(
    afterBarrier.node.flow.activeActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(afterBarrier.node.flow.pendingActors, []);
  assert.deepEqual(afterBarrier.node.flow.blockedBy, []);
  assert.deepEqual(
    afterBarrier.node.actions.map(({ interactionId }) => interactionId),
    ["moveBandits"],
  );
});

test("discard commitments are exact, single-use, and order-independent", async () => {
  const openBarrier = await replayScenario({
    game,
    scenario: discardBarrier,
    at: {
      segment: "given",
      completed: DISCARD_BARRIER_PREFIX_COMMANDS.length,
    },
  });
  const wrongCount = await probeScenarioCommand({
    replay: openBarrier,
    command: discard(0, { brick: 3 }),
  });
  assert.equal(wrongCount.kind, "rejected");
  if (wrongCount.kind === "rejected") {
    assert.equal(wrongCount.errorCode, "DISCARD_COUNT_INCORRECT");
  }
  const unrequired = await probeScenarioCommand({
    replay: openBarrier,
    command: discard(2, { brick: 1 }),
  });
  assert.equal(unrequired.kind, "rejected");
  if (unrequired.kind === "rejected") {
    assert.equal(unrequired.errorCode, "prompt-not-owned");
  }

  const afterFirst = await replayScenario({
    game,
    scenario: discardBarrier,
    at: { segment: "when", completed: 1 },
  });
  const sourceDigest = afterFirst.checkpointDigest;
  const duplicate = await probeScenarioCommand({
    replay: afterFirst,
    command: discard(1, { brick: 1, provisions: 3 }),
  });
  assert.equal(duplicate.kind, "rejected");
  if (duplicate.kind === "rejected") {
    assert.equal(duplicate.errorCode, "prompt-not-owned");
  }
  assert.equal(afterFirst.checkpointDigest, sourceDigest);

  const reverseOrder = {
    ...discardBarrier,
    id: "stormtrail.discard-barrier.reverse-order",
    when: [discard(0, { brick: 4 }), discard(1, { brick: 1, provisions: 3 })],
  };
  const reversed = await replayScenario({ game, scenario: reverseOrder });
  assert.equal(reversed.state().flow.currentPhase, "moveBandits");
  assert.deepEqual(reversed.state().publicState.discardCountsByPlayerId, {
    "player-1": 4,
    "player-2": 4,
  });
});

const tradeIdentity = {
  id: bilateralTrade.id,
  path: "test/scenarios/bilateral-trade.scenario.ts",
  sourceDigest: "sha256:stormtrail-bilateral-trade",
} as const;

test("pending bilateral trade exposes only the target response and derived blocker", async () => {
  const pending = await Promise.all(
    [0, 1, 2].map((seat) =>
      inspectScenario({
        game,
        scenario: bilateralTrade,
        identity: tradeIdentity,
        perspective: { kind: "player", seat },
        at: { segment: "given", completed: affordableTradePrefix.length },
      }),
    ),
  );
  assert.deepEqual(
    pending[0]?.node.flow.activeActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(
    pending[0]?.node.flow.pendingActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(
    pending[0]?.node.flow.continuationWaiters.map(({ seat }) => seat),
    [1],
  );
  assert.deepEqual(
    pending[0]?.node.flow.blockedBy.map(({ actor, blockers }) => ({
      waiter: actor.seat,
      blockers: blockers.map(({ seat }) => seat),
    })),
    [{ waiter: 1, blockers: [0] }],
  );
  assert.deepEqual(
    pending.map(({ node }) =>
      node.actions.map(({ interactionId }) => interactionId),
    ),
    [["acceptTrade", "rejectTrade"], [], []],
  );
  for (const inspected of pending) {
    assert.deepEqual(
      (inspected.node.view as { currentTrade: unknown }).currentTrade,
      {
        offerorPlayerId: "player-2",
        targetPlayerId: "player-1",
        give: { provisions: 1 },
        want: { brick: 1 },
      },
    );
  }

  const pendingReplay = await replayScenario({
    game,
    scenario: bilateralTrade,
    at: { segment: "given", completed: affordableTradePrefix.length },
  });
  const wrongActor = await probeScenarioCommand({
    replay: pendingReplay,
    command: accept(2),
  });
  assert.equal(wrongActor.kind, "rejected");
  if (wrongActor.kind === "rejected") {
    assert.equal(wrongActor.errorCode, "prompt-not-owned");
  }
});

test("bilateral acceptance transfers both maps atomically and resumes the offeror", async () => {
  const acceptedScenario = defineScenario({
    ...bilateralTrade,
    id: "stormtrail.bilateral-trade.accepted",
    when: [accept(0)],
  });
  const replay = await replayScenario({ game, scenario: acceptedScenario });
  assert.equal(replay.state().flow.currentPhase, "main");
  assert.deepEqual(replay.state().flow.activePlayers, ["player-2"]);
  assert.deepEqual(replay.view({ seat: 0 }).mySupplies, {
    brick: 0,
    provisions: 1,
    timber: 2,
  });
  assert.deepEqual(replay.view({ seat: 1 }).mySupplies, {
    brick: 1,
    provisions: 1,
    timber: 1,
  });
  assert.deepEqual(replay.state().publicState.tradeHistory, [
    {
      offerorPlayerId: "player-2",
      targetPlayerId: "player-1",
      give: { provisions: 1 },
      want: { brick: 1 },
      result: "accepted",
    },
  ]);
});

test("unaffordable bilateral acceptance is unavailable and rejects without mutation", async () => {
  const unaffordableScenario = defineScenario({
    id: "stormtrail.bilateral-trade.unaffordable-target",
    description: "The target lacks the requested three provisions.",
    setup: { players: 3, seed: 1 },
    given: [
      ...STANDARD_SETUP_COMMANDS,
      roll(0),
      offer(0, 1, { timber: 1 }, { provisions: 3 }),
    ],
    when: [],
    then: () => {},
  });
  const replay = await replayScenario({ game, scenario: unaffordableScenario });
  assert.equal(replay.state().flow.currentPhase, "pendingTrade");
  assert.deepEqual(
    replay
      .interactions({ seat: 1 })
      .filter(({ availability }) => availability?.status === "available")
      .map(({ interactionId }) => interactionId),
    ["rejectTrade"],
  );
  const before = replay.checkpointDigest;
  const result = await probeScenarioCommand({ replay, command: accept(1) });
  assert.equal(result.kind, "rejected");
  if (result.kind === "rejected") {
    assert.equal(result.errorCode, "TRADE_TARGET_CANNOT_PAY");
  }
  assert.equal(replay.checkpointDigest, before);
});

test("stale bilateral acceptance after a response rejects without mutation", async () => {
  const replay = await replayScenario({ game, scenario: bilateralTrade });
  assert.equal(replay.state().flow.currentPhase, "main");
  assert.equal(replay.state().publicState.currentTrade, null);
  const before = replay.checkpointDigest;
  const result = await probeScenarioCommand({ replay, command: accept(0) });
  assert.equal(result.kind, "rejected");
  assert.equal(replay.checkpointDigest, before);
  assert.deepEqual(replay.state().publicState.tradeHistory, [
    {
      offerorPlayerId: "player-2",
      targetPlayerId: "player-1",
      give: { provisions: 1 },
      want: { brick: 1 },
      result: "rejected",
    },
  ]);
});

test("bilateral offer validation rejects empty and overlapping maps without mutation", async () => {
  const mainScenario = defineScenario({
    id: "stormtrail.bilateral-trade.validation",
    description: "Reach player 1 main for offer validation.",
    setup: { players: 3, seed: 1 },
    given: [...STANDARD_SETUP_COMMANDS, roll(0)],
    when: [],
    then: () => {},
  });
  const replay = await replayScenario({ game, scenario: mainScenario });
  const before = replay.checkpointDigest;
  const empty = await probeScenarioCommand({
    replay,
    command: offer(0, 1, {}, { provisions: 1 }),
  });
  assert.equal(empty.kind, "rejected");
  if (empty.kind === "rejected") {
    assert.equal(empty.errorCode, "INVALID_TRADE_OFFER");
  }
  const overlap = await probeScenarioCommand({
    replay,
    command: offer(0, 1, { timber: 1 }, { timber: 1 }),
  });
  assert.equal(overlap.kind, "rejected");
  if (overlap.kind === "rejected") {
    assert.equal(overlap.errorCode, "GIVE_AND_WANT_OVERLAP");
  }
  assert.equal(replay.checkpointDigest, before);
});

const banditsIdentity = {
  id: banditsScenario.id,
  path: "test/scenarios/bandits.scenario.ts",
  sourceDigest: "sha256:stormtrail-bandits",
} as const;

test("Bandits exploration derives no-victim, one-victim, and multi-victim commands", async () => {
  const explored = await exploreScenario({
    game,
    scenario: banditsScenario,
    identity: banditsIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: BANDITS_PREFIX_COMMANDS.length },
    limit: 50,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.deepEqual(
    explored.candidates.map(({ command }) => command),
    [
      bandits(0, "northEastClay", 2),
      bandits(0, "northForest", 1),
      bandits(0, "northForest", 2),
      bandits(0, "northWestFields", 1),
      bandits(0, "southEastFields"),
      bandits(0, "southForest"),
      bandits(0, "southWestClay"),
    ],
  );
  assert.equal(
    explored.candidates.some(
      ({ command }) =>
        command.params.hexId === "centralBarrens",
    ),
    false,
  );
  for (const candidate of explored.candidates) {
    const replay = await replayScenario({
      game,
      scenario: banditsScenario,
      at: { segment: "given", completed: BANDITS_PREFIX_COMMANDS.length },
    });
    const result = await probeScenarioCommand({
      replay,
      command: candidate.command as never,
    });
    assert.equal(result.kind, "accepted");
  }
});

test("Bandits rejects the current hex and enforces optional victim cardinality", async () => {
  const replay = await replayScenario({
    game,
    scenario: banditsScenario,
    at: { segment: "given", completed: BANDITS_PREFIX_COMMANDS.length },
  });
  const digest = replay.checkpointDigest;
  const currentHex = await probeScenarioCommand({
    replay,
    command: bandits(0, "centralBarrens"),
  });
  assert.equal(currentHex.kind, "rejected");
  if (currentHex.kind === "rejected") {
    assert.equal(currentHex.errorCode, "BANDITS_DESTINATION_REQUIRED");
  }
  const missingVictim = await probeScenarioCommand({
    replay,
    command: bandits(0, "northForest"),
  });
  assert.equal(missingVictim.kind, "rejected");
  if (missingVictim.kind === "rejected") {
    assert.equal(missingVictim.errorCode, "STEAL_TARGET_REQUIRED");
  }
  const forbiddenVictim = await probeScenarioCommand({
    replay,
    command: bandits(0, "southWestClay", 1),
  });
  assert.equal(forbiddenVictim.kind, "rejected");
  assert.equal(replay.checkpointDigest, digest);
});

test("seeded stolen supply type is participant-only and reproducible", async () => {
  const [first, second] = await Promise.all([
    replayScenario({ game, scenario: banditsScenario }),
    replayScenario({ game, scenario: banditsScenario }),
  ]);
  assert.equal(first.checkpointDigest, second.checkpointDigest);
  assert.equal(first.view({ seat: 0 }).myLastStolenResourceId, "provisions");
  assert.equal(first.view({ seat: 1 }).myLastStolenResourceId, "provisions");
  assert.equal(first.view({ seat: 2 }).myLastStolenResourceId, null);
  assert.deepEqual(first.view({ seat: 0 }).supplyCountByPlayerId, {
    "player-1": 3,
    "player-2": 1,
    "player-3": 2,
  });
  const spectator = await inspectScenario({
    game,
    scenario: banditsScenario,
    identity: banditsIdentity,
    perspective: { kind: "spectator" },
    at: { segment: "when", completed: 1 },
  });
  assert.equal(JSON.stringify(spectator.node).includes("myLastStolen"), false);
  assert.equal(JSON.stringify(spectator.node).includes("provisions"), true);
  assert.deepEqual(
    (spectator.node.view as { lastSteal: unknown }).lastSteal,
    { thiefPlayerId: "player-1", victimPlayerId: "player-2" },
  );
});

test("privacy projection exposes exact inventories only to their owners", async () => {
  const identity = {
    id: projectionPrivacy.id,
    path: "test/scenarios/projection-privacy.scenario.ts",
    sourceDigest: "sha256:stormtrail-projection-privacy",
  } as const;
  const [playerOne, playerTwo, playerThree, spectator] = await Promise.all([
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "when", completed: 2 },
    }),
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity,
      perspective: { kind: "player", seat: 1 },
      at: { segment: "when", completed: 2 },
    }),
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity,
      perspective: { kind: "player", seat: 2 },
      at: { segment: "when", completed: 2 },
    }),
    inspectScenario({
      game,
      scenario: projectionPrivacy,
      identity,
      perspective: { kind: "spectator" },
      at: { segment: "when", completed: 2 },
    }),
  ]);
  const firstView = playerOne.node.view as Record<string, unknown>;
  const secondView = playerTwo.node.view as Record<string, unknown>;
  const thirdView = playerThree.node.view as Record<string, unknown>;
  const spectatorView = spectator.node.view as Record<string, unknown>;
  assert.deepEqual(firstView.mySupplies, {
    brick: 3,
    provisions: 0,
    timber: 2,
  });
  assert.deepEqual(secondView.mySupplies, {
    brick: 1,
    provisions: 3,
    timber: 0,
  });
  assert.deepEqual(thirdView.mySupplies, {
    brick: 2,
    provisions: 2,
    timber: 3,
  });
  assert.deepEqual(firstView.myLastDiscard, { brick: 4 });
  assert.deepEqual(secondView.myLastDiscard, { brick: 1, provisions: 3 });
  assert.equal(thirdView.myLastDiscard, null);
  assert.equal(firstView.myLastStolenResourceId, "brick");
  assert.equal(secondView.myLastStolenResourceId, "brick");
  assert.equal(thirdView.myLastStolenResourceId, null);
  for (const view of [firstView, secondView, thirdView, spectatorView]) {
    assert.deepEqual(view.supplyCountByPlayerId, {
      "player-1": 5,
      "player-2": 4,
      "player-3": 7,
    });
    assert.deepEqual(view.currentTrade, {
      offerorPlayerId: "player-1",
      targetPlayerId: "player-2",
      give: { timber: 1 },
      want: { provisions: 1 },
    });
  }
  assert.equal(Object.hasOwn(spectatorView, "mySupplies"), false);
  assert.equal(Object.hasOwn(spectatorView, "myLastDiscard"), false);
  assert.equal(Object.hasOwn(spectatorView, "myLastStolenResourceId"), false);
  assert.equal(Object.hasOwn(spectator.node, "privateState"), false);
  assert.equal(Object.hasOwn(spectator.node, "table"), false);
});

test("fixed Stormtrail topology is exactly the approved seven-hex graph", () => {
  assert.equal(Object.keys(FRONTIER.spaces).length, 7);
  assert.equal(INTERSECTION_IDS.length, 24);
  assert.equal(EDGE_IDS.length, 30);
  assert.deepEqual(
    Object.fromEntries(
      Object.values(FRONTIER.spaces).map(({ id, q, r, typeId }) => [
        id,
        { q, r, typeId },
      ]),
    ),
    {
      northForest: { q: 0, r: -1, typeId: "pineForest" },
      northEastClay: { q: 1, r: -1, typeId: "clayFlats" },
      southEastFields: { q: 1, r: 0, typeId: "grainFields" },
      southForest: { q: 0, r: 1, typeId: "pineForest" },
      southWestClay: { q: -1, r: 1, typeId: "clayFlats" },
      northWestFields: { q: -1, r: 0, typeId: "grainFields" },
      centralBarrens: { q: 0, r: 0, typeId: "barrens" },
    },
  );
  assert.deepEqual(
    new Set(Object.values(INTERSECTIONS_BY_HEX_ID).map((vertices) => vertices.length)),
    new Set([6]),
  );
  assert.deepEqual(
    Object.keys(FRONTIER.spaces).sort(),
    [
      "centralBarrens",
      "northEastClay",
      "northForest",
      "northWestFields",
      "southEastFields",
      "southForest",
      "southWestClay",
    ],
  );
});

test("setup action discovery follows seat order and adjacent trail domains", async () => {
  const identity = {
    id: topologyAndSetup.id,
    path: "test/scenarios/topology-and-setup.scenario.ts",
    sourceDigest: "sha256:stormtrail-topology-setup",
  } as const;
  const initial = await Promise.all(
    [0, 1, 2].map((seat) =>
      exploreScenario({
        game,
        scenario: topologyAndSetup,
        identity,
        perspective: { kind: "player", seat },
        at: { segment: "setup", completed: 0 },
        limit: 30,
      }),
    ),
  );
  assert.equal(initial[0]?.mode, "transitions");
  assert.equal(
    initial[0]?.mode === "transitions" ? initial[0].candidates.length : 0,
    24,
  );
  assert.equal(
    initial[1]?.mode === "transitions" ? initial[1].candidates.length : 0,
    0,
  );
  assert.equal(
    initial[2]?.mode === "transitions" ? initial[2].candidates.length : 0,
    0,
  );

  const afterCamp = await exploreScenario({
    game,
    scenario: topologyAndSetup,
    identity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "given", completed: 1 },
    limit: 10,
  });
  assert.equal(afterCamp.mode, "transitions");
  if (afterCamp.mode === "transitions") {
    assert.deepEqual(
      afterCamp.candidates.map(({ command }) => command.params.edgeId),
      [
        "hex-edge:-1,2,-1::1,1,-2",
        "hex-edge:1,1,-2::2,-1,-1",
        "hex-edge:1,1,-2::2,2,-4",
      ],
    );
  }

  const afterPair = await exploreScenario({
    game,
    scenario: topologyAndSetup,
    identity,
    perspective: { kind: "player", seat: 1 },
    at: { segment: "given", completed: 2 },
    limit: 30,
  });
  assert.equal(afterPair.mode, "transitions");
  assert.equal(
    afterPair.mode === "transitions" ? afterPair.candidates.length : 0,
    23,
  );
});

test("roll, no-discard seven, and main discovery stay scoped to the legal actor", async () => {
  const rollReplay = await replayScenario({ game, scenario: topologyAndSetup });
  assert.deepEqual(
    rollReplay
      .interactions({ seat: 0 })
      .filter(({ availability }) => availability?.status === "available")
      .map(({ interactionId }) => interactionId),
    ["rollDice"],
  );
  for (const seat of [1, 2]) {
    assert.deepEqual(
      rollReplay
        .interactions({ seat })
        .filter(({ availability }) => availability?.status === "available"),
      [],
    );
  }

  const noDiscardSeven = await replayScenario({
    game,
    scenario: banditsScenario,
    at: { segment: "given", completed: BANDITS_PREFIX_COMMANDS.length },
  });
  assert.equal(noDiscardSeven.state().publicState.lastRoll?.total, 7);
  assert.equal(noDiscardSeven.state().flow.currentPhase, "moveBandits");
  assert.deepEqual(noDiscardSeven.state().publicState.discardCountsByPlayerId, {});
  assert.deepEqual(
    noDiscardSeven
      .interactions({ seat: 0 })
      .filter(({ availability }) => availability?.status === "available")
      .map(({ interactionId }) => interactionId),
    ["moveBandits"],
  );
  for (const seat of [1, 2]) {
    assert.deepEqual(
      noDiscardSeven
        .interactions({ seat })
        .filter(({ availability }) => availability?.status === "available"),
      [],
    );
  }

  const mainScenario = defineScenario({
    id: "stormtrail.discovery.main",
    description: "Reach the first ordinary main phase for actor-scoping proof.",
    setup: { players: 3, seed: 1 },
    given: [...STANDARD_SETUP_COMMANDS, roll(0)],
    when: [],
    then: () => {},
  });
  const mainReplay = await replayScenario({ game, scenario: mainScenario });
  assert.deepEqual(
    mainReplay
      .interactions({ seat: 0 })
      .filter(({ availability }) => availability?.status === "available")
      .map(({ interactionId }) => interactionId),
    ["buildTrail", "offerTrade", "endTurn"],
  );
  for (const seat of [1, 2]) {
    assert.deepEqual(
      mainReplay
        .interactions({ seat })
        .filter(({ availability }) => availability?.status === "available"),
      [],
    );
  }
});

test("setup rejects occupied camps and non-adjacent or occupied trails", async () => {
  const afterFirstCamp = await replayScenario({
    game,
    scenario: topologyAndSetup,
    at: { segment: "given", completed: 1 },
  });
  const nonAdjacent = await probeScenarioCommand({
    replay: afterFirstCamp,
    command: trail(0, "hex-edge:1,-2,1::2,-4,2", "placeStartingTrail"),
  });
  assert.equal(nonAdjacent.kind, "rejected");
  if (nonAdjacent.kind === "rejected") {
    assert.equal(nonAdjacent.errorCode, "SETUP_TRAIL_NOT_ADJACENT");
  }

  const afterFirstPair = await replayScenario({
    game,
    scenario: topologyAndSetup,
    at: { segment: "given", completed: 2 },
  });
  const occupiedCamp = await probeScenarioCommand({
    replay: afterFirstPair,
    command: camp(1, "hex-vertex:1,1,-2", "placeStartingCamp"),
  });
  assert.equal(occupiedCamp.kind, "rejected");
  if (occupiedCamp.kind === "rejected") {
    assert.equal(occupiedCamp.errorCode, "SETUP_CAMP_OCCUPIED");
  }

  const afterSecondCamp = await replayScenario({
    game,
    scenario: topologyAndSetup,
    at: { segment: "given", completed: 3 },
  });
  const occupiedTrail = await probeScenarioCommand({
    replay: afterSecondCamp,
    command: trail(
      1,
      "hex-edge:1,1,-2::2,2,-4",
      "placeStartingTrail",
    ),
  });
  assert.equal(occupiedTrail.kind, "rejected");
  if (occupiedTrail.kind === "rejected") {
    assert.equal(occupiedTrail.errorCode, "EDGE_OCCUPIED");
  }
});

test("seeded production covers every terrain number and all no-token totals", async () => {
  const checkpoints = [
    { completed: 7, total: 8, resourceId: "provisions", hexId: "southEastFields" },
    { completed: 9, total: 5, resourceId: "timber", hexId: "northForest" },
    { completed: 11, total: 10, resourceId: "provisions", hexId: "northWestFields" },
    { completed: 27, total: 9, resourceId: "timber", hexId: "southForest" },
    { completed: 70, total: 6, resourceId: "brick", hexId: "northEastClay" },
    { completed: 78, total: 4, resourceId: "brick", hexId: "southWestClay" },
  ] as const;
  for (const expected of checkpoints) {
    const replay = await replayScenario({
      game,
      scenario: productionScenario,
      at: { segment: "given", completed: expected.completed },
    });
    assert.equal(replay.state().publicState.lastRoll?.total, expected.total);
    assert.deepEqual(replay.state().publicState.lastProduction, [
      {
        playerId:
          expected.resourceId === "provisions" && expected.total === 8
            ? "player-2"
            : expected.resourceId === "provisions"
              ? "player-3"
              : expected.total === 9
                ? "player-2"
                : expected.total === 4
                  ? "player-3"
                  : "player-1",
        resourceId: expected.resourceId,
        count: 1,
        hexId: expected.hexId,
      },
    ]);
  }

  for (const [completed, total] of [
    [15, 3],
    [29, 11],
    [51, 12],
  ] as const) {
    const replay = await replayScenario({
      game,
      scenario: productionScenario,
      at: { segment: "given", completed },
    });
    assert.equal(replay.state().publicState.lastRoll?.total, total);
    assert.deepEqual(replay.state().publicState.lastProduction, []);
  }
  const final = await replayScenario({ game, scenario: productionScenario });
  assert.equal(final.state().publicState.lastRoll?.total, 2);
  assert.deepEqual(final.state().publicState.lastProduction, []);
  assert.equal(PRODUCTION_COMMANDS.length, 219);
});

test("Bandits suppress production and multiple adjacent camps each produce", async () => {
  const suppressed = await replayScenario({
    game,
    scenario: productionScenario,
    at: { segment: "given", completed: 108 },
  });
  assert.equal(suppressed.state().publicState.lastRoll?.total, 5);
  assert.equal(suppressed.view({ seat: 0 }).banditsHexId, "northForest");
  assert.deepEqual(suppressed.state().publicState.lastProduction, []);

  const twoCamps = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 19 },
  });
  assert.deepEqual(twoCamps.state().publicState.lastProduction, [
    {
      playerId: "player-2",
      resourceId: "provisions",
      count: 2,
      hexId: "southEastFields",
    },
  ]);
  const threeCamps = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 96 },
  });
  assert.deepEqual(threeCamps.state().publicState.lastProduction, [
    {
      playerId: "player-2",
      resourceId: "timber",
      count: 3,
      hexId: "southForest",
    },
  ]);
});

test("Supply Depot exchanges are atomic, repeatable, and exactly 3:1", async () => {
  const before = await replayScenario({
    game,
    scenario: depotTrades,
    at: { segment: "given", completed: depotReadyPrefix.length },
  });
  assert.deepEqual(before.view({ seat: 1 }).mySupplies, {
    brick: 0,
    provisions: 6,
    timber: 9,
  });
  const afterOne = await replayScenario({
    game,
    scenario: depotTrades,
    at: { segment: "when", completed: 1 },
  });
  assert.deepEqual(afterOne.view({ seat: 1 }).mySupplies, {
    brick: 1,
    provisions: 6,
    timber: 6,
  });
  const afterThree = await replayScenario({ game, scenario: depotTrades });
  assert.deepEqual(afterThree.view({ seat: 1 }).mySupplies, {
    brick: 3,
    provisions: 6,
    timber: 0,
  });
  assert.equal(afterThree.state().flow.currentPhase, "main");
});

test("Supply Depot rejects same-resource and unaffordable conversions without mutation", async () => {
  const ready = await replayScenario({
    game,
    scenario: depotTrades,
    at: { segment: "given", completed: depotReadyPrefix.length },
  });
  const readyDigest = ready.checkpointDigest;
  const sameResource = await probeScenarioCommand({
    replay: ready,
    command: depot(1, "timber", "timber"),
  });
  assert.equal(sameResource.kind, "rejected");
  assert.equal(ready.checkpointDigest, readyDigest);

  const spent = await replayScenario({ game, scenario: depotTrades });
  const spentDigest = spent.checkpointDigest;
  const unaffordable = await probeScenarioCommand({
    replay: spent,
    command: depot(1, "timber", "brick"),
  });
  assert.equal(unaffordable.kind, "rejected");
  assert.equal(spent.checkpointDigest, spentDigest);
});

test("trail costs pay atomically and exhausted piece supply disables further builds", async () => {
  const beforeLast = await replayScenario({
    game,
    scenario: networkAndCosts,
    at: {
      segment: "given",
      completed: NETWORK_EXHAUSTION_COMMANDS.length - 1,
    },
  });
  assert.deepEqual(beforeLast.view({ seat: 0 }).mySupplies, {
    brick: 3,
    provisions: 0,
    timber: 1,
  });
  assert.equal(beforeLast.view({ seat: 0 }).remainingTrailsByPlayerId["player-1"], 1);

  const exhausted = await replayScenario({ game, scenario: networkAndCosts });
  assert.deepEqual(exhausted.view({ seat: 0 }).mySupplies, {
    brick: 2,
    provisions: 0,
    timber: 0,
  });
  assert.equal(exhausted.view({ seat: 0 }).remainingTrailsByPlayerId["player-1"], 0);
  assert.equal(
    exhausted
      .interactions({ seat: 0 })
      .find(({ interactionId }) => interactionId === "buildTrail")
      ?.availability?.status,
    "blocked",
  );
  const digest = exhausted.checkpointDigest;
  const extra = await probeScenarioCommand({
    replay: exhausted,
    command: trail(0, "hex-edge:-1,-4,5::-2,-2,4"),
  });
  assert.equal(extra.kind, "rejected");
  assert.equal(exhausted.checkpointDigest, digest);
});

test("opponent camps interrupt continuity while own camps and trails connect", async () => {
  const interruptedScenario = defineScenario({
    id: "stormtrail.network.interrupted",
    description: "Player 2 starts on Player 1's trail endpoint.",
    setup: { players: 3, seed: 1 },
    given: [...INTERRUPTION_SETUP_COMMANDS, roll(0)],
    when: [],
    then: () => {},
  });
  const replay = await replayScenario({ game, scenario: interruptedScenario });
  const digest = replay.checkpointDigest;
  const throughOpponent = await probeScenarioCommand({
    replay,
    command: trail(0, "hex-edge:2,2,-4::4,1,-5"),
  });
  assert.equal(throughOpponent.kind, "rejected");
  if (throughOpponent.kind === "rejected") {
    assert.equal(throughOpponent.errorCode, "TRAIL_NOT_CONNECTED");
  }
  const disconnected = await probeScenarioCommand({
    replay,
    command: trail(0, "hex-edge:-1,-4,5::-2,-2,4"),
  });
  assert.equal(disconnected.kind, "rejected");
  if (disconnected.kind === "rejected") {
    assert.equal(disconnected.errorCode, "TRAIL_NOT_CONNECTED");
  }
  const occupied = await probeScenarioCommand({
    replay,
    command: trail(0, "hex-edge:1,1,-2::2,2,-4"),
  });
  assert.equal(occupied.kind, "rejected");
  if (occupied.kind === "rejected") {
    assert.equal(occupied.errorCode, "EDGE_OCCUPIED");
  }
  const connected = await probeScenarioCommand({
    replay,
    command: trail(0, "hex-edge:1,1,-2::2,-1,-1"),
  });
  assert.equal(connected.kind, "accepted");
  assert.equal(replay.checkpointDigest, digest);
});

test("camp targets require an owned trail, an empty vertex, and full atomic cost", async () => {
  const mainScenario = defineScenario({
    id: "stormtrail.network.camp-validation",
    description: "Reach Player 1 main without provisions.",
    setup: { players: 3, seed: 1 },
    given: [...STANDARD_SETUP_COMMANDS, roll(0)],
    when: [],
    then: () => {},
  });
  const replay = await replayScenario({ game, scenario: mainScenario });
  const occupied = await probeScenarioCommand({
    replay,
    command: camp(0, "hex-vertex:1,1,-2"),
  });
  assert.equal(occupied.kind, "rejected");
  if (occupied.kind === "rejected") {
    assert.equal(occupied.errorCode, "VERTEX_OCCUPIED");
  }
  const disconnected = await probeScenarioCommand({
    replay,
    command: camp(0, "hex-vertex:-1,-4,5"),
  });
  assert.equal(disconnected.kind, "rejected");
  if (disconnected.kind === "rejected") {
    assert.equal(disconnected.errorCode, "CAMP_NOT_CONNECTED");
  }
  const insufficient = await probeScenarioCommand({
    replay,
    command: camp(0, "hex-vertex:2,2,-4"),
  });
  assert.equal(insufficient.kind, "rejected");
  if (insufficient.kind === "rejected") {
    assert.equal(insufficient.errorCode, "INSUFFICIENT_RESOURCES");
  }

  const beforeBuild = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 11 },
  });
  const afterBuild = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "given", completed: 12 },
  });
  assert.deepEqual(beforeBuild.view({ seat: 1 }).mySupplies, {
    brick: 1,
    provisions: 1,
    timber: 1,
  });
  assert.deepEqual(afterBuild.view({ seat: 1 }).mySupplies, {
    brick: 0,
    provisions: 0,
    timber: 0,
  });
  assert.equal(afterBuild.view({ seat: 1 }).remainingCampsByPlayerId["player-2"], 2);

  const terminal = await replayScenario({ game, scenario: completeGame });
  assert.equal(terminal.view({ seat: 1 }).remainingCampsByPlayerId["player-2"], 0);
  assert.equal(terminal.state().flow.currentPhase, "gameOver");
  assert.deepEqual(terminal.interactions({ seat: 1 }), []);
});
