import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.complete-game",
  description:
    "Four players pass left and legally play all thirteen tricks before one automatic ordinary-score outcome.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
    "sealed-pass": { segment: "given", completed: 2 },
    "first-trick": { segment: "given", completed: 8 },
    "mid-hand": { segment: "given", completed: 32 },
    developed: { segment: "given", completed: 55 },
    "game-over": { segment: "when", completed: 1 },
  },
  given: completeGamePath.slice(0, 55),
  when: [completeGamePath[55]],
  then: ({ expect, interactions, state, view }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.completed).toBe(true);
    expect(final.tricksCompleted).toBe(13);
    expect(final.trickHistory).toHaveLength(13);
    expect(final.trickHistory.every(({ plays }) => plays.length === 4)).toBe(
      true,
    );
    for (let index = 0; index < final.trickHistory.length - 1; index += 1) {
      expect(final.trickHistory[index + 1]?.plays[0]?.playerId).toBe(
        final.trickHistory[index]?.winnerPlayerId,
      );
    }
    expect(final.heartsBroken).toBe(true);
    expect(final.pointsByPlayer).toEqual({
      "player-1": 15,
      "player-2": 6,
      "player-3": 3,
      "player-4": 2,
    });
    expect(final.outcome?.standings).toEqual([
      { playerId: "player-4", rank: 1, result: "win", score: 2 },
      { playerId: "player-3", rank: 2, result: "loss", score: 3 },
      { playerId: "player-2", rank: 3, result: "loss", score: 6 },
      { playerId: "player-1", rank: 4, result: "loss", score: 15 },
    ]);
    expect(view({ seat: 0 }).hand).toHaveLength(0);
    for (const seat of [0, 1, 2, 3] as const) {
      expect(interactions({ seat })).toHaveLength(0);
    }
  },
});
