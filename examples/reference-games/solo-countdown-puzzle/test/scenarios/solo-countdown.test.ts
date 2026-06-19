import assert from "node:assert/strict";
import test from "node:test";
import { validateRepair } from "../../app/rules.ts";
import {
  bootstrap,
  dispatchOrThrow,
  domain,
  patchPublicState,
  phase,
  playerOrder,
  publicState,
  repairInput,
} from "../helpers/runtime.ts";

test("initial scenario has one human player and no event history", async () => {
  const { state } = await bootstrap();

  assert.deepEqual(playerOrder(state), ["player-1"]);
  assert.equal(phase(state), "playerTurn");
  assert.deepEqual(domain(state).flow.activePlayers, ["player-1"]);
  assert.equal(publicState(state).turnsRemaining, 8);
  assert.equal(publicState(state).energy, 5);
  assert.equal(publicState(state).storm, 0);
  assert.deepEqual(publicState(state).events, []);
});

test("repair action flows through deterministic weather and countdown phases", async () => {
  const runtime = await bootstrap();
  const repaired = await dispatchOrThrow(
    runtime.bundle,
    runtime.state,
    repairInput("beacon-north"),
  );
  const pub = publicState(repaired);

  assert.equal(phase(repaired), "playerTurn");
  assert.equal(pub.energy, 4);
  assert.equal(pub.beacons["beacon-north"], 1);
  assert.equal(pub.turnsRemaining, 7);
  assert.equal(pub.storm, 0);
  assert.deepEqual(
    pub.events.map((event) => event.procedureId),
    ["resolve-weather", "advance-countdown"],
  );
  assert.match(pub.events[0].summary, /calm changed storm by 0/);
  assert.match(pub.events[1].summary, /7 turns remain/);
});

test("same seed and same repair produce the same event digest", async () => {
  const first = await bootstrap();
  const second = await bootstrap();
  const firstState = await dispatchOrThrow(
    first.bundle,
    first.state,
    repairInput("beacon-north"),
  );
  const secondState = await dispatchOrThrow(
    second.bundle,
    second.state,
    repairInput("beacon-north"),
  );

  assert.deepEqual(
    publicState(firstState).events,
    publicState(secondState).events,
  );
});

test("reconnect scenario restores committed public system events", async () => {
  const runtime = await bootstrap();
  const reconnected = await dispatchOrThrow(
    runtime.bundle,
    runtime.state,
    repairInput("beacon-north"),
  );

  assert.equal(phase(reconnected), "playerTurn");
  assert.deepEqual(playerOrder(reconnected), ["player-1"]);
  assert.deepEqual(
    publicState(reconnected).events.map((event) => event.procedureId),
    ["resolve-weather", "advance-countdown"],
  );
});

test("invalid repair validation returns canonical error codes", async () => {
  const { state } = await bootstrap();

  assert.equal(
    validateRepair(domain(state), {
      playerId: "bot",
      beaconId: "beacon-north",
    }).ok,
    false,
  );
  const actor = validateRepair(domain(state), {
    playerId: "bot",
    beaconId: "beacon-north",
  });
  assert.equal(actor.ok ? null : actor.errorCode, "PLAYER_NOT_AUTHORIZED");

  const emptyEnergy = domain(patchPublicState(state, { energy: 0 }));
  const energy = validateRepair(emptyEnergy, {
    playerId: "player-1",
    beaconId: "beacon-north",
  });
  assert.equal(energy.ok ? null : energy.errorCode, "NOT_ENOUGH_ENERGY");

  const unknown = validateRepair(domain(state), {
    playerId: "player-1",
    beaconId: "missing",
  });
  assert.equal(unknown.ok ? null : unknown.errorCode, "UNKNOWN_BEACON");
});

test("terminal outcome: all beacons lit ends immediately before weather", async () => {
  const runtime = await bootstrap();
  const nearWin = patchPublicState(runtime.state, {
    beacons: {
      "beacon-north": 1,
      "beacon-harbor": 2,
      "beacon-south": 2,
    },
  });

  const result = await dispatchOrThrow(
    runtime.bundle,
    nearWin,
    repairInput("beacon-north"),
  );

  assert.equal(phase(result), "gameOver");
  assert.equal(publicState(result).completed, true);
  assert.equal(publicState(result).outcome?.reason.code, "all-beacons-lit");
  assert.deepEqual(publicState(result).events, []);
});

test("terminal outcome: storm six ends during weather before countdown", async () => {
  const runtime = await bootstrap();
  const stormFive = patchPublicState(runtime.state, {
    storm: 5,
    weatherDeck: ["gale-1", "calm-1"],
  });

  const result = await dispatchOrThrow(
    runtime.bundle,
    stormFive,
    repairInput("beacon-north"),
  );

  assert.equal(phase(result), "gameOver");
  assert.equal(publicState(result).completed, true);
  assert.equal(publicState(result).outcome?.reason.code, "storm-six");
  assert.deepEqual(
    publicState(result).events.map((event) => event.procedureId),
    ["resolve-weather"],
  );
});

test("terminal outcome: countdown exhaustion follows weather and countdown events", async () => {
  const runtime = await bootstrap();
  const finalTurn = patchPublicState(runtime.state, { turnsRemaining: 1 });

  const result = await dispatchOrThrow(
    runtime.bundle,
    finalTurn,
    repairInput("beacon-north"),
  );

  assert.equal(phase(result), "gameOver");
  assert.equal(publicState(result).completed, true);
  assert.equal(publicState(result).outcome?.reason.code, "countdown-exhausted");
  assert.deepEqual(
    publicState(result).events.map((event) => event.procedureId),
    ["resolve-weather", "advance-countdown"],
  );
});

test("harbor repair creates one reinforcement that prevents one storm card", async () => {
  const runtime = await bootstrap();
  const galeFirst = patchPublicState(runtime.state, {
    weatherDeck: ["gale-1", "calm-1"],
  });

  const result = await dispatchOrThrow(
    runtime.bundle,
    galeFirst,
    repairInput("beacon-harbor"),
  );

  assert.equal(publicState(result).reinforcement, 0);
  assert.equal(publicState(result).storm, 0);
  assert.match(publicState(result).events[0].summary, /prevented/);
});
