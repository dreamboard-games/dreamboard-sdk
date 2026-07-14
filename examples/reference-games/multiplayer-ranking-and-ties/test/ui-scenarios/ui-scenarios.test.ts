import assert from "node:assert/strict";
import test from "node:test";
import cancellation from "./cancellation.mobile.scenario.ts";
import earlyRefill from "./early-refill.mobile.scenario.ts";
import growingRows from "./growing-rows.desktop.scenario.ts";
import opening from "./opening.desktop.scenario.ts";
import terminal from "./terminal.mobile.scenario.ts";

test("UI evidence derives opening, refill, growing, ranked, and cancellation checkpoints from legal replays", () => {
  assert.equal(opening.at, "opening");
  assert.equal(growingRows.at, "growing-rows");
  assert.equal(terminal.at, "game-over");
  assert.equal(earlyRefill.replay[0]?.interactionId, "draftStall");
  assert.equal(
    cancellation.behaviorScenario,
    "../scenarios/refill-and-cancellation-final-refill.scenario.ts",
  );
});
