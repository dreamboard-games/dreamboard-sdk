import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mosaic Workshop binds the atomic placement form to one action-board target", async () => {
  const app = await readFile(
    new URL("../../ui/App.tsx", import.meta.url),
    "utf8",
  );
  const routes = await readFile(
    new URL("../../ui/interaction-routes.tsx", import.meta.url),
    "utf8",
  );
  assert.match(app, /data-reference-game="worker-placement-tableau"/);
  assert.match(app, /Board\.surface\("action-board"\)/);
  assert.match(app, /Mosaic Workshop/);
  assert.match(app, /Authoritative final scoring/);
  assert.match(routes, /"placement\.placeWorker"/);
  assert.match(routes, /spaceId: actionBoard\.slot\.space/);
  for (const field of ["workerId", "give", "receive", "itemType", "cellId"]) {
    assert.match(routes, new RegExp(`${field}: placeWorker\\.slot\\.${field}`));
  }
  assert.match(routes, /"placement\.passPlacement"/);
  assert.doesNotMatch(routes, /chooseExchange|chooseItem|chooseCell/);
});

test("six UI checkpoints use one behavior path and numeric replay coordinates", async () => {
  const names = [
    "mosaic.initial.mobile.scenario.ts",
    "mosaic.first-craft.desktop.scenario.ts",
    "mosaic.season-transition.desktop.scenario.ts",
    "mosaic.developed.mobile.scenario.ts",
    "mosaic.contention.desktop.scenario.ts",
    "mosaic.outcome.mobile.scenario.ts",
  ];
  const sources = await Promise.all(
    names.map((name) =>
      readFile(new URL(`../ui-scenarios/${name}`, import.meta.url), "utf8"),
    ),
  );
  for (const source of sources) {
    assert.match(
      source,
      /behaviorScenario: "test\/scenarios\/complete-game\.scenario\.ts"/,
    );
    assert.match(
      source,
      /at: \{ segment: "(?:setup|given|when)", completed: \d+ \}/,
    );
    assert.doesNotMatch(source, /import behaviorScenario/);
  }
});
