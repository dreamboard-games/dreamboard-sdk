import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "player-two-turn",
  description: "Pass player 1's opening turn so player 2 is active.",
  from: "initial-turn",
  runners: ["reducer"],
  async when({ game, seat }) {
    const playerId = seat(0);

    await game.submit(playerId, "endActionPhase", {});
    await game.submit(playerId, "endTurn", {});
  },
  then: ({ expect, state, view, seat }) => {
    const playerId = seat(1);
    expect(state()).toBe("playerTurn");
    expect(view(playerId).mode).toBe("action");
  },
});
