import { defineScenario } from "../testing-types.ts";
import { pass, place } from "./commands.ts";

export const JOINED_MOSAIC_SETUP = [
  place(0, "ordinary-p1-1", "timberYard"),
  pass(1),
  place(0, "ordinary-p1-2", "stoneYard"),
  place(0, "master-p1", "patronSquare"),
  pass(1),
] as const;

export default defineScenario({
  id: "mosaic-workshop.crafting-and-domains",
  description:
    "A rich but empty workshop still requires a neighbor for Joined Mosaic.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: JOINED_MOSAIC_SETUP,
  when: [],
  then: ({ expect, state, view }) => {
    expect(state().publicState.season).toBe(2);
    expect(state().publicState.activePlayerId).toBe("player-1");
    expect(view({ seat: 0 }).resourcesByPlayer["player-1"]).toEqual({
      coin: 5,
      stone: 3,
      wood: 3,
    });
    expect(state().publicState.tableauByPlayer["player-1"]).toEqual({});
  },
});
