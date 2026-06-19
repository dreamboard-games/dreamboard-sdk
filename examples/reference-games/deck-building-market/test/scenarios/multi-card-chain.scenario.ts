import { defineScenario } from "../testing-types.ts";
import { readyForCards } from "../scenario-helpers.ts";

export default defineScenario({
  id: "multi-card-chain",
  description:
    "Action-granting cards allow multiple action cards to chain in one turn.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    const player1 = ctx.seat(0);
    await readyForCards(ctx, player1, {
      hand: ["studio-2", "brainstorm-2", "open-mic-2"],
      deck: ["doodle-10", "doodle-11", "doodle-12", "doodle-13"],
    });

    await ctx.game.submit(player1, "studio", { cardId: "studio-2" });
    ctx.expect(ctx.view(player1).actionsLeft).toBe(2);
    ctx.expect(ctx.view(player1).inPlayCards).toContain("studio-2");

    await ctx.game.submit(player1, "brainstorm", { cardId: "brainstorm-2" });
    ctx.expect(ctx.view(player1).actionsLeft).toBe(1);
    ctx.expect(ctx.view(player1).inPlayCards).toContain("brainstorm-2");

    await ctx.game.submit(player1, "openMic", { cardId: "open-mic-2" });
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    expect(view(player1).inPlayCards).toContain("studio-2");
    expect(view(player1).inPlayCards).toContain("brainstorm-2");
    expect(view(player1).inPlayCards).toContain("open-mic-2");
    expect(view(player1).actionsLeft).toBe(2);
    expect(view(player1).buysLeft).toBe(2);
    expect(view(player1).coins).toBe(2);
  },
});
