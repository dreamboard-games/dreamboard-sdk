import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.scoring-and-outcome-sole-winner",
  description: "One strictly lowest penalty score yields one rank-one winner.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 55),
  when: [completeGamePath[55]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.filter(({ result }) => result === "win")).toEqual([
      { playerId: "player-4", rank: 1, result: "win", score: 2 },
    ]);
  },
});
