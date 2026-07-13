import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export const completeGameSetup = { players: 3, seed: 1 } as const;

export default defineScenario({
  id: "stormtrail.complete-game",
  description:
    "Three crews play a complete fixed-map game through production, trading, network growth, and an immediate fourth-camp victory.",
  setup: completeGameSetup,
  checkpoints: {
    "growing-network": { segment: "given", completed: 85 },
    developed: { segment: "given", completed: 110 },
    "game-over": { segment: "when", completed: 1 },
  },
  given: COMPLETE_GAME_COMMANDS.slice(0, -1),
  when: COMPLETE_GAME_COMMANDS.slice(-1),
  then: ({ expect, interactions, state, view }) => {
    const finalState = state();
    expect(finalState.flow.currentPhase).toBe("gameOver");
    expect(finalState.publicState.turnNumber).toBe(32);
    expect(finalState.publicState.outcome).toEqual({
      reason: {
        code: "FOURTH_CAMP_BUILT",
        message: "player-2 established the fourth camp.",
      },
      standings: [
        { playerId: "player-1", rank: 2, result: "loss" },
        { playerId: "player-2", rank: 1, result: "win" },
        { playerId: "player-3", rank: 2, result: "loss" },
      ],
    });
    expect(view({ seat: 1 }).remainingCampsByPlayerId["player-2"]).toBe(0);
    expect(finalState.publicState.history.at(-1)?.kind).toBe("buildCamp");
    for (const seat of [0, 1, 2]) {
      expect(interactions({ seat })).toHaveLength(0);
    }
  },
});
