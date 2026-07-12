import { defineScenario } from "../testing-types.ts";
import { THREE_PILE_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.ending-three-piles-sole-winner",
  description:
    "Three non-Masterpiece piles empty at cleanup and publish a sole winner.",
  setup: { players: 2, seed: 1 },
  given: THREE_PILE_COMMANDS.slice(0, -1),
  when: THREE_PILE_COMMANDS.slice(-1),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(view({ seat: 0 }).supplyCountByZoneId["supply-masterpiece"]).toBe(8);
    expect(state().publicState.outcome).toEqual({
      reason: {
        code: "THREE_SUPPLY_PILES_EMPTY",
        message: "At least three supply piles are empty.",
      },
      standings: [
        { playerId: "player-1", rank: 1, result: "win", score: 8 },
        { playerId: "player-2", rank: 2, result: "loss", score: 6 },
      ],
    });
  },
});
