import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { discoverReferenceGames } from "./games.ts";
const root = path.resolve(import.meta.dirname, "../..");
test("reference games are ordinary authored workspace packages", async () => {
  const games = await discoverReferenceGames({ root });
  assert.deepEqual(
    games.map((game) => game.id),
    ["hearts", "hex-network-trading"],
  );
  for (const game of games) {
    assert.equal(
      game.packageJson.dependencies?.["@dreamboard-games/sdk"],
      "workspace:*",
    );
    assert.equal(game.packageJson.scripts?.generate, undefined);
    const entry = await readFile(path.join(game.dir, "app/index.ts"), "utf8");
    assert.match(entry, /createReducerBundle\(game\)/);
    assert.doesNotMatch(entry, /generated|shared\//i);
  }
});
