import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.turn-ordering",
  description:
    "A legal first turn advances from action through buy and automatic cleanup before rotating to the opponent.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 5),
  when: COMPLETE_GAME_COMMANDS.slice(5, 6),
  then: ({ expect, state, view }) => {
    expect(state().flow.activePlayers).toEqual(["player-2"]);
    expect(state().phase.step).toBe("action");
    expect(state().publicState.turnNumber).toBe(2);
    expect(view({ seat: 0 }).handCountByPlayerId["player-1"]).toBe(5);
  },
});
