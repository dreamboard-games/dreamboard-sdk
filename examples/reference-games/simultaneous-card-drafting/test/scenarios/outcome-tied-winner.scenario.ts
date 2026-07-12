import { defineScenario } from "../testing-types.ts";
import { TIED_WINNER_COMMANDS } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.outcome-tied-winner",
  description:
    "Equal top totals produce two rank-one draws without a tie-break.",
  setup: { players: 2, seed: 8, setupProfileId: "standard" },
  given: TIED_WINNER_COMMANDS.slice(0, 22),
  when: TIED_WINNER_COMMANDS.slice(22),
  then: ({ expect, state }) => {
    expect(
      state().publicState.outcome?.standings.map(
        ({ playerId, rank, result, score }) => ({
          playerId,
          rank,
          result,
          score,
        }),
      ),
    ).toEqual([
      { playerId: "player-1", rank: 1, result: "draw", score: 16 },
      { playerId: "player-2", rank: 1, result: "draw", score: 16 },
    ]);
  },
});
