import { defineScenario } from "../testing-types";
import { readyForCards } from "../scenario-helpers";

export default defineScenario({
  id: "browser-action-chain-ready",
  description:
    "Materialize a browser-ready hand for same-turn action-card chaining.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    await readyForCards(ctx, ctx.seat(0), {
      hand: ["studio-3", "brainstorm-3", "open-mic-3"],
      deck: ["doodle-14", "doodle-15", "doodle-16", "doodle-17"],
      actionsLeft: 1,
    });
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    expect(view(player1).handCards).toEqual([
      "studio-3",
      "brainstorm-3",
      "open-mic-3",
    ]);
    expect(view(player1).actionsLeft).toBe(1);
  },
});
