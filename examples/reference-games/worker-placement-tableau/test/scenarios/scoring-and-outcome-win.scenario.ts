import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "./complete-game.scenario.ts";

export default defineScenario({
  id: "mosaic-workshop.scoring-and-outcome-win",
  description:
    "Printed and Harmony Prestige publish exact unique-winner ranks.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: COMPLETE_GAME_COMMANDS.slice(0, 8),
  when: COMPLETE_GAME_COMMANDS.slice(8),
  then: ({ expect, view }) => {
    expect(
      view({ seat: 0 }).outcome?.standings.map(({ rank, result, score }) => ({
        rank,
        result,
        score,
      })),
    ).toEqual([
      { rank: 1, result: "win", score: 20 },
      { rank: 2, result: "loss", score: 0 },
    ]);
  },
});
