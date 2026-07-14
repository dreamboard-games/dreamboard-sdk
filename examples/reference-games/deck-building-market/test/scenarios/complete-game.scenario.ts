import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.complete-game",
  description:
    "A complete two-artist game grows and reshuffles both decks, resolves all five Techniques, and reaches a supply ending after many alternating turns.",
  setup: { players: 2, seed: 1 },
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
    "first-purchase": { segment: "given", completed: 5 },
    "recycled-card": { segment: "given", completed: 26 },
    "technique-chain": { segment: "given", completed: 62 },
    developed: { segment: "given", completed: 361 },
    "game-over": { segment: "when", completed: 1 },
  },
  given: COMPLETE_GAME_COMMANDS.slice(0, -1),
  when: COMPLETE_GAME_COMMANDS.slice(-1),
  then: ({ expect, interactions, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(state().publicState.turnNumber).toBe(47);
    expect(state().publicState.outcome).toEqual({
      reason: {
        code: "SIMULTANEOUS_SUPPLY_END",
        message:
          "The Masterpiece pile and at least three supply piles are empty.",
      },
      standings: [
        { playerId: "player-1", rank: 2, result: "loss", score: 20 },
        { playerId: "player-2", rank: 1, result: "win", score: 42 },
      ],
    });
    expect(view({ seat: 0 }).supplyCountByZoneId["supply-masterpiece"]).toBe(0);
    expect(view({ seat: 0 }).supplyCountByZoneId["supply-sketch"]).toBe(0);
    expect(view({ seat: 0 }).supplyCountByZoneId["supply-idea"]).toBe(0);
    expect(
      state().publicState.history.some(
        ({ kind, cardId }) => kind === "technique" && cardId === "brainstorm-1",
      ),
    ).toBe(true);
    for (const seat of [0, 1]) expect(interactions({ seat })).toHaveLength(0);
  },
});
