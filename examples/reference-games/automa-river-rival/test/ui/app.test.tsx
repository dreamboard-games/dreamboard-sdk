import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Automa River Rival UI exposes runtime routes and system-event proof", async () => {
  const appSource = await readFile(
    new URL("../../ui/App.tsx", import.meta.url),
    "utf8",
  );
  const routesSource = await readFile(
    new URL("../../ui/interaction-routes.tsx", import.meta.url),
    "utf8",
  );

  assert.match(appSource, /data-reference-game=\{referenceGameId\}/);
  assert.match(appSource, /GameEventLog/);
  assert.match(routesSource, /Interaction\.Routes/);
  assert.match(routesSource, /claimCargo/);
  assert.match(routesSource, /claimId: "main-claim"/);
});
