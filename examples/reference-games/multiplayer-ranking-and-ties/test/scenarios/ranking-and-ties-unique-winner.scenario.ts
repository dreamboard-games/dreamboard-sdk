import { fourPlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.ranking-and-ties-unique-winner",
  description: "A legal four-player game ends with one score-leading winner.",
  setup: { players: 4, seed: 2 },
  given: fourPlayerCompletePath.slice(0, 23),
  when: [fourPlayerCompletePath[23]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.filter(({ result }) => result === "win")).toHaveLength(1);
    expect(standings[0]).toMatchObject({
      playerId: "player-1",
      rank: 1,
      score: 22,
    });
  },
});
