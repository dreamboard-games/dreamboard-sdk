import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "player-turn-roll",
  description: "Seat 0 rolls dice on their first turn after setup",
  from: "after-setup",
  when: async ({ game, seat }) => {
    // `rollDice` uses `rngInput.d6(2)` — the engine samples the dice
    // server-side, so the client submits no params.
    await game.submit(seat(0), "rollDice", {});
  },
  then: ({ expect, state, view, seat }) => {
    expect(state()).toBe("playerTurn");
    const p1View = view(seat(0));
    expect(p1View.diceRolled).toBe(true);
    if (!p1View.diceValues) {
      throw new Error("Expected dice values after rolling.");
    }
    const [d1, d2] = p1View.diceValues;
    expect(Number.isInteger(d1) && d1 >= 1 && d1 <= 6).toBe(true);
    expect(Number.isInteger(d2) && d2 >= 1 && d2 <= 6).toBe(true);
  },
});
