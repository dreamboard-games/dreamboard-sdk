import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayerId } from "../../shared/manifest-contract.ts";
import { scenarioMetadata } from "../../app/phases/scenarios.ts";
import { assertCanonicalOutcome } from "./assertions.ts";

test("second revealed storm creates a scoreless cancellation outcome", () => {
  const outcome = scenarioMetadata.scorelessCancellation.state.outcome!;
  assertCanonicalOutcome(outcome, ["player-1", "player-2"] as PlayerId[]);
  assert.deepEqual(outcome, {
    reason: {
      code: "FESTIVAL_CANCELLED",
      message: "A second storm cancelled the harbor fair before scoring.",
    },
    standings: [
      { playerId: "player-1", rank: 1, result: "draw" },
      { playerId: "player-2", rank: 1, result: "draw" },
    ],
  });
  assert.equal(scenarioMetadata.scorelessCancellation.state.stormsRevealed, 2);
  assert.deepEqual(
    scenarioMetadata.scorelessCancellation.state.events
      .filter((event) => event.kind === "storm-revealed")
      .map((event) => event.stormId),
    ["storm-1", "storm-2"],
  );
  for (const row of outcome.standings) {
    assert.equal("score" in row, false);
    assert.equal("scoreBreakdown" in row, false);
    assert.equal("tieBreaks" in row, false);
  }
});
