import assert from "node:assert/strict";
import {
  claimCargo,
  createInitialState,
  referenceGame,
  resolveRival,
  scenarioMetadata,
} from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "automa-river-rival");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.equal(referenceGame.players.min, 1);
assert.equal(referenceGame.players.max, 1);
assert.deepEqual(createInitialState().playerIds, ["player-1"]);
assert.equal(referenceGame.systemProcedures.length, 4);

const resolved = resolveRival(createInitialState());
assert.equal(resolved.rivalProgress, 3);
assert.deepEqual(
  resolved.events.map((event) => event.procedureId),
  coverage.scenarios.claimHighest.eventProcedureIds,
);
assert.equal(scenarioMetadata.claimHighest.result.accepted, true);
assert.equal(scenarioMetadata.claimHighest.result.state.teamScore, 2);
assert.deepEqual(
  scenarioMetadata.seedRepeat.first.state.events,
  scenarioMetadata.seedRepeat.second.state.events,
);
assert.equal(
  claimCargo(createInitialState(), { playerId: "bot" }).accepted,
  false,
);
assert.equal(
  claimCargo(createInitialState(), { playerId: "bot" }).validation.errorCode,
  "PLAYER_NOT_AUTHORIZED",
);
console.log(`${referenceGame.id}: scenario coverage verified`);
