import { createGame, compileManifest, defineTopologyManifest } from "../src/reducer.js";
import { z } from "zod";
import type { Card } from "../src/index.js";
const model = createGame({ manifest: compileManifest(defineTopologyManifest({ players: { minPlayers: 2, maxPlayers: 4 }, cardSets: [], zones: [{ id: "table", name: "Table", scope: "shared", visibility: "public" }] })), phases: { play: z.object({}) }, state: { public: z.object({}), hidden: z.object({}), private: z.object({}) } });
const play = model.phase("play");
const game = model.assemble({ initial: { public: () => ({}) }, initialPhase: "play", phases: { play: play.define({ kind: "player", initialState: () => ({}), interactions: {} }) }, view: model.view(() => ({})) });
function face(card: Card<typeof game, Record<never, never>>) {
  if (!card.view) return "back";
  return card.view.name;
}
void face;
