import type { CardId } from "../../shared/manifest-contract";
import type { PlayerId } from "../testing-types";
import { defineScenario } from "../testing-types";
import { interaction, readyForCards } from "../scenario-helpers";
import type { ScenarioContext } from "../testing-types";

// Read the first server-eligible card target for a resolve interaction, so the
// scenario stays robust to whichever concrete supply card id sits on top of a
// pile in the base state.
function firstEligibleTarget(
  ctx: ScenarioContext,
  playerId: PlayerId,
  interactionId: string,
  inputKey: string,
): CardId {
  const descriptor = interaction(ctx, playerId, interactionId);
  const input = descriptor?.inputs.find((entry) => entry.key === inputKey);
  const domain = input?.domain;
  const targets =
    domain && "eligibleTargets" in domain ? domain.eligibleTargets : [];
  const target = targets[0];
  if (!target) {
    throw new Error(`No eligible ${inputKey} target for ${interactionId}.`);
  }
  return target as CardId;
}

export default defineScenario({
  id: "card-effects",
  description: "Every authored Sketchbook action card resolves its effect.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    const player1 = ctx.seat(0);

    await readyForCards(ctx, player1, {
      hand: ["brainstorm-1"],
      deck: ["doodle-1", "doodle-2", "doodle-3"],
    });
    await ctx.game.submit(player1, "brainstorm", { cardId: "brainstorm-1" });
    ctx.expect(ctx.view(player1).handCards).toHaveLength(3);
    ctx.expect(ctx.view(player1).actionsLeft).toBe(0);

    await readyForCards(ctx, player1, {
      hand: ["studio-1"],
      deck: ["doodle-4"],
    });
    await ctx.game.submit(player1, "studio", { cardId: "studio-1" });
    ctx.expect(ctx.view(player1).handCards).toHaveLength(1);
    ctx.expect(ctx.view(player1).actionsLeft).toBe(2);

    await readyForCards(ctx, player1, {
      hand: ["gallery-1"],
      deck: ["doodle-5"],
    });
    await ctx.game.submit(player1, "gallery", { cardId: "gallery-1" });
    ctx.expect(ctx.view(player1).handCards).toHaveLength(1);
    ctx.expect(ctx.view(player1).actionsLeft).toBe(1);
    ctx.expect(ctx.view(player1).buysLeft).toBe(2);
    ctx.expect(ctx.view(player1).coins).toBe(1);

    await readyForCards(ctx, player1, { hand: ["open-mic-1"] });
    await ctx.game.submit(player1, "openMic", { cardId: "open-mic-1" });
    ctx.expect(ctx.view(player1).actionsLeft).toBe(2);
    ctx.expect(ctx.view(player1).buysLeft).toBe(2);
    ctx.expect(ctx.view(player1).coins).toBe(2);

    const player2DiscardBefore = ctx.view(ctx.seat(1)).discardCards.length;
    await readyForCards(ctx, player1, {
      hand: ["critic-1"],
      deck: ["doodle-6", "doodle-7"],
    });
    await ctx.game.submit(player1, "critic", { cardId: "critic-1" });
    ctx.expect(ctx.view(player1).handCards).toHaveLength(2);
    ctx
      .expect(ctx.view(ctx.seat(1)).discardCards.length)
      .toBe(player2DiscardBefore + 1);

    // Eraser is now a two-step play: play the card (enters the resolve step),
    // then select the hand cards to trash directly from the hand.
    await readyForCards(ctx, player1, {
      hand: ["eraser-1", "doodle-8", "idea-1"],
    });
    await ctx.game.submit(player1, "eraser", { cardId: "eraser-1" });
    ctx.expect(ctx.view(player1).mode).toBe("resolve");
    await ctx.game.submit(player1, "resolveEraser", {
      trashedCardIds: ["doodle-8", "idea-1"] satisfies CardId[],
    });
    ctx.expect(ctx.view(player1).mode).toBe("action");
    ctx.expect(ctx.view(player1).handCards).toHaveLength(0);

    await readyForCards(ctx, player1, {
      hand: ["sketchpad-1", "doodle-9", "idea-2"],
      deck: ["sketch-1", "inkwork-1"],
    });
    await ctx.game.submit(player1, "sketchpad", { cardId: "sketchpad-1" });
    await ctx.game.submit(player1, "resolveSketchpad", {
      discardedCardIds: ["doodle-9", "idea-2"] satisfies CardId[],
    });
    ctx.expect(ctx.view(player1).handCards).toEqual(["sketch-1", "inkwork-1"]);
    ctx.expect(ctx.view(player1).actionsLeft).toBe(1);

    await readyForCards(ctx, player1, { hand: ["studio-visit-1"] });
    await ctx.game.submit(player1, "studioVisit", {
      cardId: "studio-visit-1",
    });
    await ctx.game.submit(player1, "resolveStudioVisit", {
      gainCardId: firstEligibleTarget(
        ctx,
        player1,
        "resolveStudioVisit",
        "gainCardId",
      ),
    });
    ctx.expect(ctx.view(player1).discardCards.length).toBe(1);
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    expect(
      view(player1).inPlayCards.some((id) => id === "studio-visit-1"),
    ).toBe(true);
    expect(view(player1).actionsLeft).toBe(0);
  },
});
