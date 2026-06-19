import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "storm",
  description: "Seat 1 rolled 7",
  from: "after-setup",
  when: async ({ game, seat }) => {
    // `rollDice` uses `rngInput.d6(2)` — the engine samples the dice
    // server-side, so the client submits no params.
    await game.submit(seat(0), "rollDice", {});
    await game.submit(seat(0), "endTurn", {});
    await game.submit(seat(1), "rollDice", {});
  },
  then: ({ expect, state, view, seat }) => {},
});
