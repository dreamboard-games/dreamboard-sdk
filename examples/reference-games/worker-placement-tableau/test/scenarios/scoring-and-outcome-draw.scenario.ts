import { defineScenario } from "../testing-types.ts";
import { COMPLETE_DRAW_COMMANDS } from "./complete-game-draw.scenario.ts";

export default defineScenario({
  id: "mosaic-workshop.scoring-and-outcome-draw",
  description: "Equal Prestige publishes rank one and draw for both workshops.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: COMPLETE_DRAW_COMMANDS.slice(0, 4),
  when: COMPLETE_DRAW_COMMANDS.slice(4),
  then: ({ expect, view }) => {
    expect(
      view({ seat: 0 }).outcome?.standings.map(({ rank, result, score }) => ({
        rank,
        result,
        score,
      })),
    ).toEqual([
      { rank: 1, result: "draw", score: 0 },
      { rank: 1, result: "draw", score: 0 },
    ]);
  },
});
