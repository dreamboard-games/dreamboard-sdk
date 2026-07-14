import { tiedLowestPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.scoring-and-outcome-tied-lowest",
  description:
    "Two equal lowest scores share rank one and both receive draw results.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: tiedLowestPath.slice(0, 55),
  when: [tiedLowestPath[55]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.map(({ rank }) => rank)).toEqual([1, 1, 3, 4]);
    expect(standings.slice(0, 2)).toEqual([
      { playerId: "player-1", rank: 1, result: "draw", score: 0 },
      { playerId: "player-4", rank: 1, result: "draw", score: 0 },
    ]);
  },
});
