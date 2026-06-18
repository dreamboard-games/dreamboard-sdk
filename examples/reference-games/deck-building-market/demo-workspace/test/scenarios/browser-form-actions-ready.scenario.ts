import { defineScenario } from "../testing-types";
import { readyForCards } from "../scenario-helpers";

export default defineScenario({
  id: "browser-form-actions-ready",
  description:
    "Materialize a browser-ready hand for Eraser, Sketchpad, and Studio Visit form effects.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    await readyForCards(ctx, ctx.seat(0), {
      hand: [
        "eraser-2",
        "sketchpad-2",
        "studio-visit-2",
        "doodle-18",
        "idea-3",
      ],
      deck: ["sketch-2", "inkwork-2"],
      actionsLeft: 3,
    });
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    expect(view(player1).handCards).toEqual([
      "eraser-2",
      "sketchpad-2",
      "studio-visit-2",
      "doodle-18",
      "idea-3",
    ]);
    expect(view(player1).actionsLeft).toBe(3);
  },
});
