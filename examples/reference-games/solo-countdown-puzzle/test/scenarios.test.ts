import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScenario,
  exploreScenario,
  inspectScenario,
  replayScenario,
} from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";
import { weatherCardIds } from "../app/game-contract.ts";
import availabilityCharge from "./scenarios/availability-charge.scenario.ts";
import availabilityReinforceNoEnergy from "./scenarios/availability-reinforce-no-energy.scenario.ts";
import availabilityReinforceStored from "./scenarios/availability-reinforce-stored.scenario.ts";
import availabilityRepairBeacon from "./scenarios/availability-repair-beacon.scenario.ts";
import availabilityRepairNoEnergy from "./scenarios/availability-repair-no-energy.scenario.ts";
import completeGameLossDawn from "./scenarios/complete-game-loss-dawn.scenario.ts";
import completeGameLossStorm from "./scenarios/complete-game-loss-storm.scenario.ts";
import completeGame from "./scenarios/complete-game.scenario.ts";
import determinismAndActors from "./scenarios/determinism-and-actors.scenario.ts";
import weatherProcedureCalm from "./scenarios/weather-procedure-calm.scenario.ts";
import weatherProcedureGaleReinforced from "./scenarios/weather-procedure-gale-reinforced.scenario.ts";
import weatherProcedureGale from "./scenarios/weather-procedure-gale.scenario.ts";
import weatherProcedureHarborSquallReinforced from "./scenarios/weather-procedure-harbor-squall-reinforced.scenario.ts";
import weatherProcedureHarborSquall from "./scenarios/weather-procedure-harbor-squall.scenario.ts";
import weatherProcedureNorthSquallReinforced from "./scenarios/weather-procedure-north-squall-reinforced.scenario.ts";
import weatherProcedureNorthSquall from "./scenarios/weather-procedure-north-squall.scenario.ts";
import weatherProcedureSouthSquallReinforced from "./scenarios/weather-procedure-south-squall-reinforced.scenario.ts";
import weatherProcedureSouthSquall from "./scenarios/weather-procedure-south-squall.scenario.ts";

const scenarios = [
  completeGame,
  completeGameLossStorm,
  completeGameLossDawn,
  availabilityCharge,
  availabilityRepairBeacon,
  availabilityRepairNoEnergy,
  availabilityReinforceStored,
  availabilityReinforceNoEnergy,
  weatherProcedureCalm,
  weatherProcedureGale,
  weatherProcedureGaleReinforced,
  weatherProcedureNorthSquall,
  weatherProcedureNorthSquallReinforced,
  weatherProcedureHarborSquall,
  weatherProcedureHarborSquallReinforced,
  weatherProcedureSouthSquall,
  weatherProcedureSouthSquallReinforced,
  determinismAndActors,
] as const;

for (const scenario of scenarios) {
  test(scenario.id, async () => {
    const replay = await replayScenario({ game, scenario });
    await assertScenario({ replay, assertion: scenario.then });
  });
}

test("ordinary setup shuffles the exact hidden weather deck once", async () => {
  const [replay, inspected] = await Promise.all([
    replayScenario({
      game,
      scenario: completeGame,
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: {
        id: completeGame.id,
        path: "test/scenarios/complete-game.scenario.ts",
        sourceDigest: "sha256:last-light-ordinary-setup",
      },
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
  ]);

  const deck = replay.state().hiddenState.weatherDeck;
  assert.deepEqual([...deck].sort(), [...weatherCardIds].sort());
  assert.equal(new Set(deck).size, weatherCardIds.length);
  assert.equal(inspected.node.entropy.draws.length, 7);
  assert.equal(
    inspected.node.entropy.draws.every(
      (draw, index) =>
        draw.index === index &&
        draw.cursorBefore === index &&
        draw.cursorAfter === index + 1 &&
        draw.operation.kind === "integer" &&
        draw.operation.parameters.minInclusive === 0 &&
        draw.operation.parameters.maxInclusive === 7 - index,
    ),
    true,
  );
});

test("a playerTurn derives one human actor, legal actions, and no blockers", async () => {
  const [player, spectator] = await Promise.all([
    inspectScenario({
      game,
      scenario: completeGame,
      identity: {
        id: completeGame.id,
        path: "test/scenarios/complete-game.scenario.ts",
        sourceDigest: "sha256:last-light-player-turn",
      },
      perspective: { kind: "player", seat: 0 },
      at: { segment: "setup", completed: 0 },
    }),
    inspectScenario({
      game,
      scenario: completeGame,
      identity: {
        id: completeGame.id,
        path: "test/scenarios/complete-game.scenario.ts",
        sourceDigest: "sha256:last-light-player-turn",
      },
      perspective: { kind: "spectator" },
      at: { segment: "setup", completed: 0 },
    }),
  ]);

  assert.deepEqual(player.node.flow.activeActors, [
    { seat: 0, playerId: "player-1" },
  ]);
  assert.deepEqual(player.node.flow.pendingActors, []);
  assert.deepEqual(player.node.flow.continuationWaiters, []);
  assert.deepEqual(player.node.flow.blockedBy, []);
  assert.deepEqual(
    player.node.actions.map(({ interactionId }) => interactionId).sort(),
    ["charge", "reinforce", "repairBeacon"],
  );
  assert.deepEqual(spectator.node.actions, []);
  assert.equal(JSON.stringify(spectator.node).includes("weatherDeck"), false);
});

test("inspect distinguishes visible interactions from currently performable actions", async () => {
  const checkpoints = await Promise.all(
    [
      availabilityCharge,
      availabilityRepairNoEnergy,
      availabilityReinforceStored,
      availabilityReinforceNoEnergy,
    ].map((scenario) =>
      inspectScenario({
        game,
        scenario,
        identity: {
          id: scenario.id,
          path: `test/scenarios/${scenario.id}.scenario.ts`,
          sourceDigest: `sha256:${scenario.id}`,
        },
        perspective: { kind: "player", seat: 0 },
        at: { segment: "when", completed: scenario.when.length },
      }),
    ),
  );

  const [atChargeCap, atZeroEnergy, withStoredDefense, belowDefenseCost] =
    checkpoints;
  assert.ok(
    atChargeCap && atZeroEnergy && withStoredDefense && belowDefenseCost,
  );
  assert.deepEqual(
    atChargeCap.node.actions.map(({ interactionId }) => interactionId),
    ["repairBeacon", "reinforce"],
  );
  assert.deepEqual(
    atZeroEnergy.node.actions.map(({ interactionId }) => interactionId),
    ["charge"],
  );
  assert.equal(
    withStoredDefense.node.interactions.find(
      ({ interactionId }) => interactionId === "reinforce",
    )?.availability.code,
    "REINFORCEMENT_ALREADY_STORED",
  );
  assert.equal(
    belowDefenseCost.node.interactions.find(
      ({ interactionId }) => interactionId === "reinforce",
    )?.availability.code,
    "NOT_ENOUGH_ENERGY",
  );
});

test("the same seed and command path reproduces hidden order, events, state, and outcome", async () => {
  const [first, second] = await Promise.all([
    replayScenario({ game, scenario: determinismAndActors }),
    replayScenario({ game, scenario: determinismAndActors }),
  ]);

  assert.deepEqual(first.state(), second.state());
  assert.deepEqual(first.view({ seat: 0 }), second.view({ seat: 0 }));
  assert.deepEqual(first.diagnostics.events, second.diagnostics.events);
  assert.equal(JSON.stringify(first.state()).includes("environment"), false);
  assert.equal(JSON.stringify(first.state()).includes("opponent"), false);
});

test("explore enumerates five accepted opening commands from the player perspective", async () => {
  const explored = await exploreScenario({
    game,
    scenario: completeGame,
    identity: {
      id: completeGame.id,
      path: "test/scenarios/complete-game.scenario.ts",
      sourceDigest: "sha256:last-light-opening-explore",
    },
    perspective: { kind: "player", seat: 0 },
    at: { segment: "setup", completed: 0 },
  });

  assert.equal(explored.mode, "transitions");
  if (explored.mode !== "transitions") return;
  assert.equal(explored.candidates.length, 5);
  assert.deepEqual(
    explored.candidates.map(({ command }) => command.interactionId).sort(),
    ["charge", "reinforce", "repairBeacon", "repairBeacon", "repairBeacon"],
  );
  assert.equal(
    explored.candidates.every(
      ({ after }) =>
        after.flow.phase === "playerTurn" && after.flow.blockedBy.length === 0,
    ),
    true,
  );
});
