import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("worker placement is authored target-first with worker follow-up", async () => {
  const workerPlacement = await readFile(
    new URL("../../app/phases/placement/worker-placement.ts", import.meta.url),
    "utf8",
  );
  const routes = await readFile(
    new URL("../../ui/interaction-routes.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    workerPlacement,
    /const spaceId = input\.add\(\s*"spaceId",\s*boardInput\.space/s,
  );
  assert.match(workerPlacement, /dependsOn: \[spaceId\]/);
  assert.match(workerPlacement, /evaluatePlacement\(state, playerId, pieceId/);
  assert.match(routes, /<placeWorkerForm\.State unavailable=\{null\}>/);
  assert.match(routes, /state\.draft\.spaceId/);
  assert.match(routes, /title="Choose worker"/);
});

test("pending form choices use dialog presentation", async () => {
  const routes = await readFile(
    new URL("../../ui/interaction-routes.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routes, /title="Resolve market"/);
  assert.match(routes, /title="Resolve trade post"/);
  assert.match(routes, /title="Discard library card"/);
  assert.match(routes, /title="Recall worker"/);
  assert.match(routes, /title="Choose worker"/);
  assert.match(routes, /Reassign destination/);
});

test("pending action chrome exposes cancel through Game.Chrome", async () => {
  const layout = await readFile(
    new URL("../../ui/components/game-ui.tsx", import.meta.url),
    "utf8",
  );

  assert.match(layout, /<Game\.Chrome>/);
  assert.match(layout, /activeAction\.pendingInput\?\.title/);
  assert.match(layout, /onClick=\{cancel\}/);
  assert.match(layout, />\s*Cancel\s*<\/button>/);
});
