import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "terminal-winner-after-endturn",
  description:
    "An empty Masterpiece pile ends the game only after endTurn routes through checkGameEnd.",
  from: "empty-masterpiece-before-endturn",
  runners: ["reducer"],
  async when({ game, seat, state, view, expect }) {
    const playerId = seat(0);

    expect(state()).toBe("playerTurn");
    expect(view(playerId).gameOver).toBe(false);
    expect(view(playerId).winnerPlayerId).toBe(null);

    await game.submit(playerId, "endActionPhase", {});
    await game.submit(playerId, "endTurn", {});
  },
  then: ({ expect, state, view, interactions, seat }) => {
    const winner = seat(0);
    expect(state()).toBe("gameOver");
    expect(view(winner).gameOver).toBe(true);
    expect(view(winner).winnerPlayerId).toBe(winner);
    expect(
      interactions(winner).some(
        (descriptor) => descriptor.interactionId === "endTurn",
      ),
    ).toBe(false);
  },
});
