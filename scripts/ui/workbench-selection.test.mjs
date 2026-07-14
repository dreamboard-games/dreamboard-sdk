import assert from "node:assert/strict";
import test from "node:test";

import { selectWorkbenchSources } from "./workbench-selection.mjs";

test("scenario selection resolves only its owning reference game", async () => {
  const selection = await selectWorkbenchSources({
    scenario: "hex-network-trading.growing-network.desktop",
  });
  assert.deepEqual(selection.gameIds, ["hex-network-trading"]);
  assert.equal(selection.focused, true);
});

test("component and capability selection resolve games before materialization", async () => {
  const component = await selectWorkbenchSources({ component: "Panel" });
  assert(component.scenarioIds.length > 0);
  assert(component.gameIds.length > 0);

  const capability = await selectWorkbenchSources({
    capability: "accessibility-scan",
  });
  assert(capability.scenarioIds.length > 0);
  assert(capability.gameIds.length > 0);
});

test("changed selection uses checked-in source ownership", async () => {
  const selection = await selectWorkbenchSources(
    { changed: true },
    {
      changedFiles: [
        "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
      ],
    },
  );
  assert.deepEqual(selection.gameIds, ["hearts"]);
  assert(selection.scenarioIds.every((id) => id.startsWith("hearts.")));
});

test("unfiltered selection retains the full-catalog path", async () => {
  const selection = await selectWorkbenchSources({});
  assert.deepEqual(selection.gameIds, []);
  assert.equal(selection.focused, false);
});
