import assert from "node:assert/strict";
import test from "node:test";
import cancellation from "./cancellation.mobile.scenario.ts";
import earlyRefill from "./early-refill.mobile.scenario.ts";
import growingRows from "./growing-rows.desktop.scenario.ts";
import opening from "./opening.desktop.scenario.ts";
import terminal from "./terminal.mobile.scenario.ts";

test("UI evidence derives opening, refill, growing, ranked, and cancellation checkpoints from legal replays", () => {
  assert.deepEqual(opening.at, { segment: "setup", completed: 0 });
  assert.deepEqual(growingRows.at, { segment: "given", completed: 12 });
  assert.deepEqual(terminal.at, { segment: "when", completed: 1 });
  assert.equal(earlyRefill.replay[0]?.interactionId, "draftStall");
  assert.equal(
    cancellation.behaviorScenario,
    "../scenarios/refill-and-cancellation-final-refill.scenario.ts",
  );
  assert.deepEqual(earlyRefill.environment.input, ["touch", "keyboard"]);
});
