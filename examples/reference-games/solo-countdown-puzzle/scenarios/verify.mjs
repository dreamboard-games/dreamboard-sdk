import assert from "node:assert/strict";
import {
  createInitialState,
  referenceGame,
  repairBeacon,
  scenarioMetadata,
  validateRepair,
} from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "solo-countdown-puzzle");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.equal(referenceGame.players.min, 1);
assert.equal(referenceGame.players.max, 1);
assert.deepEqual(createInitialState().playerIds, ["player-1"]);
assert.equal(referenceGame.systemProcedures.length, 2);
assert.ok(coverage.replay.eligibleSpaceIds.includes(coverage.replay.spaceId));

const initial = createInitialState();
const repaired = repairBeacon(initial, { beaconId: "beacon-north" });
assert.equal(repaired.accepted, true);
assert.equal(repaired.state.energy, 4);
assert.equal(repaired.state.beacons["beacon-north"], 1);
assert.equal(repaired.state.events.length, 2);
assert.deepEqual(
  repaired.state.events.map((event) => event.procedureId),
  ["resolve-weather", "advance-countdown"],
);
assert.deepEqual(
  scenarioMetadata.seedRepeat.first.state.events,
  scenarioMetadata.seedRepeat.second.state.events,
);
assert.equal(
  validateRepair(initial, { playerId: "bot", beaconId: "beacon-north" })
    .errorCode,
  "PLAYER_NOT_AUTHORIZED",
);
assert.equal(
  validateRepair(
    { ...initial, energy: 0 },
    { playerId: "player-1", beaconId: "beacon-north" },
  ).errorCode,
  "NOT_ENOUGH_ENERGY",
);
assert.equal(
  validateRepair(initial, { playerId: "player-1", beaconId: "missing" })
    .errorCode,
  "UNKNOWN_BEACON",
);
console.log(`${referenceGame.id}: scenario coverage verified`);
