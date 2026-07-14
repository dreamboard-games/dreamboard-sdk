import { defineScenario } from "../testing-types.ts";
import { MASTERPIECE_TIE_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.ending-masterpiece-tied-draw",
  description:
    "Masterpiece exhaustion ends at cleanup and publishes an exact tied-score draw.",
  setup: { players: 2, seed: 1 },
  given: MASTERPIECE_TIE_COMMANDS.slice(0, -1),
  when: MASTERPIECE_TIE_COMMANDS.slice(-1),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(view({ seat: 0 }).supplyCountByZoneId["supply-masterpiece"]).toBe(0);
    expect(state().publicState.outcome).toEqual({
      reason: {
        code: "MASTERPIECE_SUPPLY_EMPTY",
        message: "The Masterpiece pile is empty.",
      },
      standings: [
        { playerId: "player-1", rank: 1, result: "draw", score: 27 },
        { playerId: "player-2", rank: 1, result: "draw", score: 27 },
      ],
    });
  },
});
