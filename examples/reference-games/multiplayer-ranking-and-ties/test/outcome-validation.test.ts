import assert from "node:assert/strict";
import test from "node:test";
import type { HarborOutcome, PlayerId } from "../app/game-contract.ts";
import { assertOutcomePlayerCoverage } from "../app/rules.ts";

const players = ["player-1", "player-2"] as const satisfies readonly PlayerId[];

function outcome(standings: HarborOutcome["standings"]): HarborOutcome {
  return {
    reason: { code: "SIX_ROUNDS_COMPLETE" },
    standings,
  };
}

test("outcome coverage rejects missing, duplicate, and unknown player standings", () => {
  assert.throws(
    () =>
      assertOutcomePlayerCoverage(
        outcome([{ playerId: "player-1", rank: 1, result: "win" }]),
        players,
      ),
    /missing player 'player-2'/,
  );
  assert.throws(
    () =>
      assertOutcomePlayerCoverage(
        outcome([
          { playerId: "player-1", rank: 1, result: "win" },
          { playerId: "player-1", rank: 2, result: "loss" },
        ]),
        players,
      ),
    /duplicate player 'player-1'/,
  );
  assert.throws(
    () =>
      assertOutcomePlayerCoverage(
        outcome([
          { playerId: "player-1", rank: 1, result: "win" },
          {
            playerId: "player-3" as PlayerId,
            rank: 2,
            result: "loss",
          },
        ]),
        players,
      ),
    /unknown player 'player-3'/,
  );
});
