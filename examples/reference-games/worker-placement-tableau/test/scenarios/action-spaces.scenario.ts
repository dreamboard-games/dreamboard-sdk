import { defineScenario } from "../testing-types.ts";
import { craft, exchange, pass, place } from "./commands.ts";

export const ACTION_SPACE_COMMANDS = [
  // Season 1: ordinary/master resolution at Timber Yard and Stone Yard.
  place(0, "ordinary-p1-1", "timberYard"),
  place(1, "master-p2", "timberYard"),
  place(0, "ordinary-p1-2", "patronSquare"),
  place(1, "ordinary-p2-1", "stoneYard"),
  place(0, "master-p1", "stoneYard"),
  exchange(1, "ordinary-p2-2", { coin: 1 }, { wood: 1 }),
  // Season 2: ordinary/master resolution at Patron Square and Exchange House.
  place(1, "ordinary-p2-1", "patronSquare"),
  place(0, "master-p1", "patronSquare"),
  place(1, "ordinary-p2-2", "timberYard"),
  exchange(0, "ordinary-p1-1", { coin: 2 }, { wood: 1, stone: 1 }),
  exchange(1, "master-p2", { coin: 2 }, { wood: 1, stone: 1 }),
  pass(0),
  // Season 3: ordinary/master resolution at Mosaic Bench.
  craft(0, "ordinary-p1-1", "timberFrame", "cell-r0-c0"),
  craft(1, "master-p2", "timberFrame", "cell-r0-c0"),
] as const;

export default defineScenario({
  id: "mosaic-workshop.action-spaces",
  description:
    "All five spaces resolve for ordinary workers and sharing masters.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: ACTION_SPACE_COMMANDS.slice(0, 12),
  when: ACTION_SPACE_COMMANDS.slice(12),
  then: ({ expect, state, view }) => {
    expect(state().publicState.season).toBe(3);
    expect(view({ seat: 0 }).occupantsBySpace.mosaicBench).toEqual([
      "master-p2",
      "ordinary-p1-1",
    ]);
    expect(state().publicState.tableauByPlayer).toEqual({
      "player-1": { "cell-r0-c0": "timberFrame" },
      "player-2": { "cell-r0-c0": "timberFrame" },
    });
    const kinds = state().publicState.events.map(({ kind }) => kind);
    expect(kinds.filter((kind) => kind === "resourcesGained").length).toBe(8);
    expect(kinds.filter((kind) => kind === "resourcesExchanged").length).toBe(
      3,
    );
    expect(kinds.filter((kind) => kind === "itemCrafted").length).toBe(2);
  },
});
