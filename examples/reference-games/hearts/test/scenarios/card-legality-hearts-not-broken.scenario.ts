import { asPlayerId } from "@dreamboard-games/sdk/reducer";
import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-hearts-not-broken",
  description:
    "An early trick leader with mixed suits cannot lead a Heart before Hearts are broken.",
  setup: { players: 4, seed: 1 },
  given: completeGamePath.slice(0, 8),
  when: [],
  then: ({ expect, state }) => {
    expect(state().flow.activePlayers).toEqual([asPlayerId("player-3")]);
    expect(state().publicState.heartsBroken).toBe(false);
  },
});
