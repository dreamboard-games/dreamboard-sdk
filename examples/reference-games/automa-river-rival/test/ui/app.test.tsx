import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("River Guild UI uses the generated contract for river choices and public procedure proof", async () => {
  const appSource = await readFile(
    new URL("../../ui/App.tsx", import.meta.url),
    "utf8",
  );
  const routesSource = await readFile(
    new URL("../../ui/interaction-routes.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /data-reference-game="automa-river-rival"/);
  assert.match(appSource, /UI\.defineSurfaces/);
  assert.match(appSource, /Zone\.collection/);
  assert.match(appSource, /procedureEvents/);
  assert.match(appSource, /Authoritative cooperative outcome/);
  assert.match(routesSource, /Interaction\.Routes/);
  assert.match(routesSource, /"humanTurn\.claimCargo"/);
  assert.match(routesSource, /cargoId: river\.slot\.card/);
  assert.doesNotMatch(routesSource, /claimId/);
});

test("River Guild UI checkpoints reference one source scenario by path and numeric prefix", async () => {
  const sources = await Promise.all(
    [
      "river.opening.mobile.scenario.ts",
      "river.early.desktop.scenario.ts",
      "river.midgame.desktop.scenario.ts",
      "river.terminal.mobile.scenario.ts",
    ].map((fileName) =>
      readFile(new URL(`../ui-scenarios/${fileName}`, import.meta.url), "utf8"),
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
