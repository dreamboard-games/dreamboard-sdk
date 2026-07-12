import { defineScenario } from "../testing-types.ts";
import { completeGameSetup } from "./complete-game.scenario.ts";
import { COMPLETE_GAME_COMMANDS } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.outcome-sole-winner",
  description: "A higher total produces one winner and competition rank two.",
  setup: completeGameSetup,
  given: COMPLETE_GAME_COMMANDS.slice(0, 22),
  when: COMPLETE_GAME_COMMANDS.slice(22),
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
      { playerId: "player-1", rank: 1, result: "win", score: 21 },
      { playerId: "player-2", rank: 2, result: "loss", score: 18 },
    ]);
  },
});
