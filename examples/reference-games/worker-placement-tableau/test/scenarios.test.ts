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
import type { GameEvent } from "../app/game-contract.ts";
import actionSpaces from "./scenarios/action-spaces.scenario.ts";
import completeGameDraw from "./scenarios/complete-game-draw.scenario.ts";
import completeGame, {
  COMPLETE_GAME_COMMANDS,
} from "./scenarios/complete-game.scenario.ts";
import craftingAndDomains from "./scenarios/crafting-and-domains.scenario.ts";
import scoringAndOutcomeDraw from "./scenarios/scoring-and-outcome-draw.scenario.ts";
import scoringAndOutcomeWin from "./scenarios/scoring-and-outcome-win.scenario.ts";
import turnAndCleanup from "./scenarios/turn-and-cleanup.scenario.ts";
import { TURN_CLEANUP_COMMANDS } from "./scenarios/turn-and-cleanup.scenario.ts";
import workerOccupancy from "./scenarios/worker-occupancy.scenario.ts";
import { craft, exchange, place } from "./scenarios/commands.ts";

const scenarios = [
  actionSpaces,
  completeGame,
  completeGameDraw,
  craftingAndDomains,
  scoringAndOutcomeDraw,
  scoringAndOutcomeWin,
  turnAndCleanup,
  workerOccupancy,
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

test("the complete game is deterministic and consumes no entropy", async () => {
  const scenarioIdentity = identity(
    completeGame,
    "test/scenarios/complete-game.scenario.ts",
  );
  const [first, second, opening, terminal] = await Promise.all([
    replayScenario({ game, scenario: completeGame }),
    replayScenario({ game, scenario: completeGame }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "when", completed: 8 },
    }),
  ]);
  assert.deepEqual(first.state(), second.state());
  assert.deepEqual(first.view({ seat: 0 }), second.view({ seat: 0 }));
  assert.deepEqual(first.trace, second.trace);
  assert.deepEqual(opening.node.entropy.draws, []);
  assert.deepEqual(terminal.node.entropy.draws, []);
  assert.equal(COMPLETE_GAME_COMMANDS.length, 16);
  assert.deepEqual(terminal.node.actions, []);
});

test("ordinary, sharing-master, master/master, and third-worker occupancy branches", async () => {
  const afterOrdinary = await replayScenario({
    game,
    scenario: workerOccupancy,
    at: { segment: "given", completed: 1 },
  });
  const ordinaryRejected = await probeScenarioCommand({
    replay: afterOrdinary,
    command: place(1, "ordinary-p2-1", "timberYard"),
  });
  assert.equal(ordinaryRejected.kind, "rejected");
  const masterAccepted = await probeScenarioCommand({
    replay: afterOrdinary,
    command: place(1, "master-p2", "timberYard"),
  });
  assert.equal(masterAccepted.kind, "accepted");

  const afterSharing = await replayScenario({
    game,
    scenario: workerOccupancy,
  });
  for (const command of [
    place(0, "ordinary-p1-2", "timberYard"),
    place(0, "master-p1", "timberYard"),
  ]) {
    const rejected = await probeScenarioCommand({
      replay: afterSharing,
      command,
    });
    assert.equal(rejected.kind, "rejected");
  }
});

test("the first-player marker alternates after the first three cleanups", async () => {
  const checkpoints = [
    {
      at: { segment: "given", completed: 4 } as const,
      season: 2,
      first: "player-2",
    },
    {
      at: { segment: "when", completed: 4 } as const,
      season: 3,
      first: "player-1",
    },
    {
      at: { segment: "when", completed: 8 } as const,
      season: 4,
      first: "player-2",
    },
  ] as const;
  for (const checkpoint of checkpoints) {
    const replay = await replayScenario({
      game,
      scenario: turnAndCleanup,
      at: checkpoint.at,
    });
    assert.equal(replay.state().publicState.season, checkpoint.season);
    assert.equal(replay.state().publicState.firstPlayerId, checkpoint.first);
    assert.deepEqual(replay.state().publicState.passedPlayerIds, []);
    assert.equal(
      Object.values(replay.state().publicState.workerLocations).every(
        (x) => x === null,
      ),
      true,
    );
  }
  assert.equal(TURN_CLEANUP_COMMANDS.length, 16);
});

test("Exchange House accepts totals one and two and rejects every invalid branch", async () => {
  const opening = await replayScenario({
    game,
    scenario: workerOccupancy,
    at: { segment: "setup", completed: 0 },
  });
  for (const command of [
    exchange(0, "ordinary-p1-1", { coin: 1 }, { wood: 1 }),
    exchange(0, "ordinary-p1-1", { coin: 2 }, { wood: 1, stone: 1 }),
  ]) {
    const accepted = await probeScenarioCommand({ replay: opening, command });
    assert.equal(accepted.kind, "accepted");
  }
  for (const command of [
    exchange(0, "ordinary-p1-1", {}, {}),
    exchange(0, "ordinary-p1-1", { coin: 1 }, { wood: 2 }),
    exchange(0, "ordinary-p1-1", { wood: 2 }, { coin: 2 }),
    exchange(0, "ordinary-p1-1", { coin: 1 }, { coin: 1 }),
  ]) {
    const rejected = await probeScenarioCommand({ replay: opening, command });
    assert.equal(rejected.kind, "rejected");
  }
  for (const command of [
    exchange(0, "ordinary-p1-1", { coin: -1 }, { wood: 1 }),
    exchange(0, "ordinary-p1-1", { coin: 0.5 }, { wood: 1 }),
  ]) {
    await assert.rejects(
      () => probeScenarioCommand({ replay: opening, command }),
      /scenario\.probe\[0\]\.params\.give\.coin/,
    );
  }
});

test("all craft types resolve while affordability, occupancy, and adjacency reject", async () => {
  const completed = await replayScenario({ game, scenario: completeGame });
  assert.deepEqual(
    completed
      .state()
      .publicState.events.filter(
        (event): event is Extract<GameEvent, { kind: "itemCrafted" }> =>
          event.kind === "itemCrafted",
      )
      .map(({ itemType }) => itemType),
    [
      "timberFrame",
      "stoneRelief",
      "joinedMosaic",
      "timberFrame",
      "joinedMosaic",
    ],
  );

  const opening = await replayScenario({
    game,
    scenario: workerOccupancy,
    at: { segment: "setup", completed: 0 },
  });
  const unaffordable = await probeScenarioCommand({
    replay: opening,
    command: craft(0, "ordinary-p1-1", "timberFrame", "cell-r0-c0"),
  });
  assert.equal(unaffordable.kind, "rejected");

  const richEmpty = await replayScenario({
    game,
    scenario: craftingAndDomains,
  });
  const noNeighbor = await probeScenarioCommand({
    replay: richEmpty,
    command: craft(0, "ordinary-p1-1", "joinedMosaic", "cell-r0-c0"),
  });
  assert.equal(noNeighbor.kind, "rejected");

  const seasonFour = await replayScenario({
    game,
    scenario: completeGame,
    at: { segment: "when", completed: 5 },
  });
  const occupied = await probeScenarioCommand({
    replay: seasonFour,
    command: craft(0, "ordinary-p1-1", "timberFrame", "cell-r0-c0"),
  });
  assert.equal(occupied.kind, "rejected");
});

test("inspect identifies the sole actor and explore emits only legal complete commands", async () => {
  const scenarioIdentity = identity(
    workerOccupancy,
    "test/scenarios/worker-occupancy.scenario.ts",
  );
  const at = { segment: "setup", completed: 0 } as const;
  const [seat0, seat1, explored] = await Promise.all([
    inspectScenario({
      game,
      scenario: workerOccupancy,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at,
    }),
    inspectScenario({
      game,
      scenario: workerOccupancy,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 1 },
      at,
    }),
    exploreScenario({
      game,
      scenario: workerOccupancy,
      identity: scenarioIdentity,
      perspective: { kind: "player", seat: 0 },
      at,
      limit: 100,
    }),
  ]);
  assert.deepEqual(
    seat0.node.flow.activeActors.map(({ seat }) => seat),
    [0],
  );
  assert.deepEqual(seat0.node.flow.blockedBy, []);
  assert.deepEqual(
    seat0.node.actions.map(({ interactionId }) => interactionId),
    ["placeWorker", "passPlacement"],
  );
  assert.deepEqual(seat1.node.actions, []);
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.equal(explored.candidates.length, 46);
  for (const candidate of explored.candidates) {
    assert.equal(candidate.command.actor.seat, 0);
    const replay = await replayScenario({
      game,
      scenario: workerOccupancy,
      at,
    });
    const probe = await probeScenarioCommand({
      replay,
      command: candidate.command as ScenarioCommandOf<typeof game>,
    });
    assert.equal(probe.kind, "accepted");
  }
});

test("explore emits only legal item-cell pairs after the tableau develops", async () => {
  const scenarioIdentity = identity(
    completeGame,
    "test/scenarios/complete-game.scenario.ts",
  );
  const explored = await exploreScenario({
    game,
    scenario: completeGame,
    identity: scenarioIdentity,
    perspective: { kind: "player", seat: 0 },
    at: { segment: "when", completed: 5 },
    limit: 100,
  });
  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.deepEqual(explored.omissions, []);
  assert.equal(explored.candidates.length, 88);
  const craftPairs = explored.candidates
    .filter(({ command }) => command.params.spaceId === "mosaicBench")
    .map(
      ({ command }) => `${command.params.itemType}:${command.params.cellId}`,
    );
  assert.equal(craftPairs.length, 24);
  assert.deepEqual(
    new Set(craftPairs),
    new Set([
      "timberFrame:cell-r0-c2",
      "timberFrame:cell-r1-c1",
      "timberFrame:cell-r1-c2",
      "stoneRelief:cell-r0-c2",
      "stoneRelief:cell-r1-c1",
      "stoneRelief:cell-r1-c2",
      "joinedMosaic:cell-r0-c2",
      "joinedMosaic:cell-r1-c1",
    ]),
  );
});
