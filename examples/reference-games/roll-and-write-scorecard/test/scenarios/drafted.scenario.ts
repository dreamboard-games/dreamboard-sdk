import test from "node:test";
import assert from "node:assert/strict";
import { createDraft } from "../../app/model.ts";
import { rolledState } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.draft",
  description:
    "Drafted scorecard state preserves a pending mark before submit.",
};

test("draft does not mutate submitted marks", () => {
  const state = rolledState();
  const draft = createDraft(state, {
    playerId: "player-1",
    cellId: "cell-0-1",
  });
  assert.deepEqual(draft, {
    kind: "survey-mark",
    playerId: "player-1",
    cellId: "cell-0-1",
    round: 1,
    rollTotal: 5,
    validAt: "1:2-3",
  });
  assert.equal(state.marks["player-1"]?.["cell-0-1"], undefined);
});
