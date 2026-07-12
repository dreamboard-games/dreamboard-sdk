import { defineScenario } from "../testing-types.ts";
import { LOWER_PLACE_TIE_COMMANDS } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.outcome-lower-place-tie",
  description:
    "One winner is followed by two equal rank-two losses under competition ranking.",
  setup: { players: 3, seed: 15, setupProfileId: "standard" },
  given: LOWER_PLACE_TIE_COMMANDS.slice(0, 33),
  when: LOWER_PLACE_TIE_COMMANDS.slice(33),
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
      { playerId: "player-3", rank: 1, result: "win", score: 25 },
      { playerId: "player-1", rank: 2, result: "loss", score: 22 },
      { playerId: "player-2", rank: 2, result: "loss", score: 22 },
    ]);
  },
});
