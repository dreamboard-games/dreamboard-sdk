import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
  type ScenarioCommandOf,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import claimActionability from "./scenarios/claim-actionability.scenario.ts";
import completeGameSoloDraw from "./scenarios/complete-game-solo-draw.scenario.ts";
import completeGameSoloLoss from "./scenarios/complete-game-solo-loss.scenario.ts";
import completeGameSoloWin from "./scenarios/complete-game-solo-win.scenario.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import cooperativeOutcome1 from "./scenarios/cooperative-outcome-1.scenario.ts";
import cooperativeOutcome2 from "./scenarios/cooperative-outcome-2.scenario.ts";
import noFakePlayer from "./scenarios/no-fake-player.scenario.ts";
import procedureEvents from "./scenarios/procedure-events.scenario.ts";
import rivalClaimHighestTie from "./scenarios/rival-instruction-claim-highest-tie.scenario.ts";
import rivalClaimHighestUnique from "./scenarios/rival-instruction-claim-highest-unique.scenario.ts";
import rivalClaimKindGrainAbsent from "./scenarios/rival-instruction-claim-kind-grain-absent.scenario.ts";
import rivalClaimKindGrainHighest from "./scenarios/rival-instruction-claim-kind-grain-highest.scenario.ts";
import rivalClaimKindGrainTie from "./scenarios/rival-instruction-claim-kind-grain-tie.scenario.ts";
import rivalClaimKindOreAbsent from "./scenarios/rival-instruction-claim-kind-ore-absent.scenario.ts";
import rivalClaimKindOreHighest from "./scenarios/rival-instruction-claim-kind-ore-highest.scenario.ts";
import rivalClaimKindOreTie from "./scenarios/rival-instruction-claim-kind-ore-tie.scenario.ts";
import rivalClaimKindTimberAbsent from "./scenarios/rival-instruction-claim-kind-timber-absent.scenario.ts";
import rivalClaimKindTimberHighest from "./scenarios/rival-instruction-claim-kind-timber-highest.scenario.ts";
import rivalClaimKindTimberTie from "./scenarios/rival-instruction-claim-kind-timber-tie.scenario.ts";
import rivalSweepLeft from "./scenarios/rival-instruction-sweep-left.scenario.ts";
import setupAndDeterminism from "./scenarios/setup-and-determinism.scenario.ts";
import { claim } from "./scenarios/commands.ts";

const scenarios = [
  claimActionability,
  completeGameSoloDraw,
  completeGameSoloLoss,
  completeGameSoloWin,
  completeGame,
  cooperativeOutcome1,
  cooperativeOutcome2,
  noFakePlayer,
  procedureEvents,
  rivalClaimHighestTie,
  rivalClaimHighestUnique,
  rivalClaimKindGrainAbsent,
  rivalClaimKindGrainHighest,
  rivalClaimKindGrainTie,
  rivalClaimKindOreAbsent,
  rivalClaimKindOreHighest,
  rivalClaimKindOreTie,
  rivalClaimKindTimberAbsent,
  rivalClaimKindTimberHighest,
  rivalClaimKindTimberTie,
  rivalSweepLeft,
  setupAndDeterminism,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

function identity(scenario: { readonly id: string }, path: string) {
  return {
    id: scenario.id,
    path,
    sourceDigest: `sha256:${scenario.id}`,
  } as const;
}

test("setup and complete play reproduce decks, claims, events, and outcome", async () => {
  const [first, second, completeFirst, completeSecond, inspected] =
    await Promise.all([
      replayScenario({ game, scenario: setupAndDeterminism }),
      replayScenario({ game, scenario: setupAndDeterminism }),
      replayScenario({ game, scenario: completeGame }),
      replayScenario({ game, scenario: completeGame }),
      inspectScenario({
        game,
        scenario: setupAndDeterminism,
        identity: identity(
          setupAndDeterminism,
          "test/scenarios/setup-and-determinism.scenario.ts",
        ),
        perspective: { kind: "player", seat: 0 },
        at: { segment: "setup", completed: 0 },
      }),
    ]);
  assert.deepEqual(first.state(), second.state());
  assert.deepEqual(first.view({ seat: 0 }), second.view({ seat: 0 }));
  assert.deepEqual(completeFirst.state(), completeSecond.state());
  assert.deepEqual(
    completeFirst.view({ seat: 0 }),
    completeSecond.view({ seat: 0 }),
  );
  assert.deepEqual(completeFirst.trace, completeSecond.trace);
  assert.equal(inspected.node.entropy.draws.length, 28);
  assert.deepEqual(
    inspected.node.entropy.draws.map(
      (draw) => draw.operation.parameters.maxInclusive,
    ),
    [
      23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4,
      3, 2, 1, 5, 4, 3, 2, 1,
    ],
  );
});

test("inspect exposes only the active human action and explore enumerates the exact river", async () => {
  const scenarioIdentity = identity(
    claimActionability,
    "test/scenarios/claim-actionability.scenario.ts",
  );
  const opening = await replayScenario({
    game,
    scenario: claimActionability,
    at: { segment: "setup", completed: 0 },
  });
  const [seat0, seat1, explored] = await Promise.all([
    inspectScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 1 },
      at: { segment: "setup", completed: 0 },
    }),
    exploreScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
      limit: 20,
    }),
  ]);
  assert.deepEqual(
    seat0.node.flow.activeActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(seat0.node.flow.blockedBy, []);
  assert.deepEqual(
    seat0.node.actions.map(({ interactionId }) => interactionId),
    ["claimCargo"],
  );
  assert.deepEqual(seat1.node.actions, []);
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  const riverIds = new Set(opening.view({ seat: 0 }).river.map(({ id }) => id));
  assert.equal(explored.candidates.length, 4);
  assert.deepEqual(
    new Set(explored.candidates.map(({ command }) => command.params.cargoId)),
    riverIds,
  );
  for (const candidate of explored.candidates) {
    assert.equal(candidate.command.actor.seat, 0);
    assert.equal(candidate.command.interactionId, "claimCargo");
    const probe = await probeScenarioCommand({
      replay: opening,
      command: candidate.command as ScenarioCommandOf<typeof game>,
    });
    assert.equal(probe.kind, "accepted");
  }
});

test("wrong-seat, removed, stale, and manifest-known nonriver cargo claims reject", async () => {
  const opening = await replayScenario({
    game,
    scenario: claimActionability,
    at: { segment: "setup", completed: 0 },
  });
  const wrongSeat = await probeScenarioCommand({
    replay: opening,
    command: claim(1, "timber-1-1"),
  });
  assert.equal(wrongSeat.kind, "rejected");
  if (wrongSeat.kind === "rejected") {
    assert.equal(wrongSeat.errorCode, "NOT_YOUR_TURN");
  }

  const afterHumanClaim = await replayScenario({
    game,
    scenario: claimActionability,
  });
  for (const cargoId of ["timber-1-1", "claim-highest-1"] as const) {
    const rejected = await probeScenarioCommand({
      replay: afterHumanClaim,
      command: {
        actor: { seat: 1 },
        interactionId: "claimCargo",
        params: { cargoId },
      } as ScenarioCommandOf<typeof game>,
    });
    assert.equal(rejected.kind, "rejected");
    if (rejected.kind === "rejected") {
      assert.equal(rejected.errorCode, "CARD_TARGET_NOT_ELIGIBLE");
    }
  }

  const afterRivalClaim = await replayScenario({
    game,
    scenario: procedureEvents,
  });
  const stale = await probeScenarioCommand({
    replay: afterRivalClaim,
    command: claim(0, "timber-3-2"),
  });
  assert.equal(stale.kind, "rejected");
  if (stale.kind === "rejected") {
    assert.equal(stale.errorCode, "CARD_TARGET_NOT_ELIGIBLE");
  }
});

test("hidden deck identities stay private in both player and spectator inspections", async () => {
  const opening = await replayScenario({
    game,
    scenario: claimActionability,
    at: { segment: "setup", completed: 0 },
  });
  const hiddenIds = [
    ...opening.state().table.zones.shared["cargo-deck"],
    ...opening.state().table.zones.shared["instruction-deck"],
  ];
  const scenarioIdentity = identity(
    claimActionability,
    "test/scenarios/claim-actionability.scenario.ts",
  );
  const inspections = await Promise.all([
    inspectScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 1 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: claimActionability,
      identity: scenarioIdentity,
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);
  for (const inspection of inspections) {
    const serialized = JSON.stringify(inspection.node);
    for (const hiddenId of hiddenIds) {
      assert.equal(serialized.includes(hiddenId), false, hiddenId);
    }
  }
});

test("rival state never enters actor, seat, blocker, or player-targeted surfaces", async () => {
  const scenarioIdentity = identity(
    procedureEvents,
    "test/scenarios/procedure-events.scenario.ts",
  );
  const inspections = await Promise.all([
    ...[0, 1].map((seat) =>
      inspectScenario({
        game,
        scenario: procedureEvents,
        identity: scenarioIdentity,
        perspective: { kind: "player" as const, seat },
        at: { segment: "when" as const, completed: 1 },
      }),
    ),
    inspectScenario({
      game,
      scenario: procedureEvents,
      identity: scenarioIdentity,
      perspective: { kind: "spectator" },
      at: { segment: "when", completed: 1 },
    }),
  ]);
  for (const { node } of inspections) {
    assert.deepEqual(
      (node.view as { playerIds: readonly string[] }).playerIds,
      ["player-1", "player-2"],
    );
    assert.equal(node.flow.blockedBy.length, 0);
    for (const actor of [
      ...node.flow.activeActors,
      ...node.flow.pendingActors,
      ...node.flow.continuationWaiters,
      ...node.actions.map(({ actor }) => actor),
    ]) {
      assert.equal(["player-1", "player-2"].includes(actor.playerId), true);
    }
    const serialized = JSON.stringify(node);
    assert.equal(serialized.includes("rivalPlayerId"), false);
    assert.equal(serialized.includes("claimId"), false);
    assert.equal(serialized.includes("processedClaims"), false);
  }
  const events = (
    inspections[0]!.node.view as {
      procedureEvents: readonly Record<string, unknown>[];
    }
  ).procedureEvents.filter(({ kind }) => String(kind).startsWith("rival-"));
  assert.equal(
    events.every((event) => !("playerId" in event)),
    true,
  );
});

test("the canonical complete game exposes setup, early, midgame, and terminal checkpoints", async () => {
  const checkpoints = await Promise.all([
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "setup", completed: 0 },
    }),
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "given", completed: 1 },
    }),
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "given", completed: 6 },
    }),
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "when", completed: 2 },
    }),
  ]);
  assert.deepEqual(
    checkpoints.map((checkpoint) => checkpoint.view({ seat: 0 }).currentPhase),
    ["humanTurn", "humanTurn", "humanTurn", "gameOver"],
  );
  assert.deepEqual(
    checkpoints.map(
      (checkpoint) =>
        checkpoint.view({ seat: 0 }).rival.instructionHistory.length,
    ),
    [0, 0, 3, 6],
  );
  assert.deepEqual(
    checkpoints.map((checkpoint) => checkpoint.view({ seat: 0 }).teamScore),
    [0, 1, 9, 24],
  );
});
