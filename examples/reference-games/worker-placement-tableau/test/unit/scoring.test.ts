import assert from "node:assert/strict";
import test from "node:test";
import { replayScenario } from "@dreamboard-games/sdk/testing";
import game from "../../app/game.ts";
import type { GameState } from "../../app/game-contract.ts";
import { scorePlayer } from "../../app/rules/scoring.ts";
import workerOccupancy from "../scenarios/worker-occupancy.scenario.ts";

test("printed prestige and unique different-item orthogonal edges score exactly", async () => {
  const opening = await replayScenario({
    game,
    scenario: workerOccupancy,
    at: { segment: "setup", completed: 0 },
  });
  const withTableau = (
    tableau: GameState["publicState"]["tableauByPlayer"]["player-1"],
  ): GameState =>
    ({
      ...opening.state(),
      publicState: {
        ...opening.state().publicState,
        tableauByPlayer: {
          ...opening.state().publicState.tableauByPlayer,
          "player-1": tableau,
        },
      },
    }) as unknown as GameState;

  assert.deepEqual(
    scorePlayer(
      withTableau({ "cell-r0-c0": "timberFrame", "cell-r0-c1": "stoneRelief" }),
      "player-1",
    ),
    { printed: 5, harmony: 1, total: 6 },
  );
  assert.deepEqual(
    scorePlayer(
      withTableau({ "cell-r0-c0": "timberFrame", "cell-r0-c1": "timberFrame" }),
      "player-1",
    ),
    { printed: 4, harmony: 0, total: 4 },
  );
  assert.deepEqual(
    scorePlayer(
      withTableau({ "cell-r0-c0": "timberFrame", "cell-r1-c1": "stoneRelief" }),
      "player-1",
    ),
    { printed: 5, harmony: 0, total: 5 },
  );
});
