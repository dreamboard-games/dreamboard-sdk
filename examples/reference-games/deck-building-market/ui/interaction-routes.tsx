import {
  Interaction,
  type InteractionRoutes,
} from "../shared/generated/ui-contract.ts";
import type { SketchbookSurfaces } from "./surfaces";

// Calm, paper-friendly buttons. Hard-offset shadow is reserved for the single
// primary action; secondary actions stay flat and lift slightly on hover.
export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-1 rounded-xl border-2 border-[#2d2d2d]/80 bg-[#fdfbf7] px-4 py-2 text-sm font-bold text-[#2d2d2d] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:border-[#2d2d2d]/20 disabled:bg-[#ece7dd] disabled:text-slate-400";

export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-1 rounded-xl border-2 border-[#2d2d2d] bg-[#ff6b6b] px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#2d2d2d] transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#2d2d2d] active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:border-[#2d2d2d]/20 disabled:bg-[#ece7dd] disabled:text-slate-400 disabled:shadow-none";

type RouteSurfaces = Pick<SketchbookSurfaces, "hand" | "market">;

/**
 * Declares every interaction's collector binding in one place. The play card
 * actions and resolve interactions both collect from the hand card slot
 * (`hand.slot.card`); supply taps (buy + Studio Visit gain) collect from
 * `market.slot.card`. The active phase/step decides which interaction a tap
 * routes to, so the bindings can safely overlap.
 */
export function SketchbookRoutes({ hand, market }: RouteSurfaces) {
  const routes = {
    "setup.submit": { collect: {} },
    "playerTurn.submit": { collect: {} },
    "playerTurn.endActionPhase": { collect: {} },
    "playerTurn.playAllTreasures": { collect: {} },
    "playerTurn.playTreasure": { collect: { cardId: hand.slot.card } },
    "playerTurn.endTurn": { collect: {} },
    "playerTurn.buyCard": { collect: { cardId: market.slot.card } },
    "playerTurn.brainstorm": { collect: { cardId: hand.slot.card } },
    "playerTurn.studio": { collect: { cardId: hand.slot.card } },
    "playerTurn.gallery": { collect: { cardId: hand.slot.card } },
    "playerTurn.openMic": { collect: { cardId: hand.slot.card } },
    "playerTurn.critic": { collect: { cardId: hand.slot.card } },
    "playerTurn.eraser": { collect: { cardId: hand.slot.card } },
    "playerTurn.sketchpad": { collect: { cardId: hand.slot.card } },
    "playerTurn.studioVisit": { collect: { cardId: hand.slot.card } },
    "playerTurn.resolveEraser": {
      collect: { trashedCardIds: hand.slot.card },
    },
    "playerTurn.resolveSketchpad": {
      collect: { discardedCardIds: hand.slot.card },
    },
    "playerTurn.resolveStudioVisit": {
      collect: { gainCardId: market.slot.card },
    },
    "checkGameEnd.submit": { collect: {} },
    "gameOver.submit": { collect: {} },
  } satisfies InteractionRoutes;

  return <Interaction.Routes routes={routes} />;
}

/**
 * The single contextual primary action for the current step. Tapping cards
 * (hand to play / stage, supply to buy / gain) is the main interaction; this
 * surfaces the one commit/advance button that a step still needs. Rendered
 * inside the hand action slot so it docks with the hand on mobile.
 */
export function SketchbookPrimaryActions({
  selectedCount,
  endActionLabel = "End actions",
}: {
  selectedCount: number;
  endActionLabel?: string;
}) {
  const setupForm = Interaction.useForm("setup.submit");
  const endActionPhaseForm = Interaction.useForm("playerTurn.endActionPhase");
  const playAllTreasuresForm = Interaction.useForm(
    "playerTurn.playAllTreasures",
  );
  const endTurnForm = Interaction.useForm("playerTurn.endTurn");
  const resolveEraserForm = Interaction.useForm("playerTurn.resolveEraser");
  const resolveSketchpadForm = Interaction.useForm(
    "playerTurn.resolveSketchpad",
  );
  const checkGameEndForm = Interaction.useForm("checkGameEnd.submit");
  const gameOverForm = Interaction.useForm("gameOver.submit");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <setupForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <setupForm.Submit className={PRIMARY_BUTTON}>
              Start
            </setupForm.Submit>
          ) : null
        }
      </setupForm.State>

      <resolveEraserForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <resolveEraserForm.Submit className={PRIMARY_BUTTON}>
              {selectedCount > 0
                ? `Trash ${selectedCount} ${selectedCount === 1 ? "card" : "cards"}`
                : "Trash nothing"}
            </resolveEraserForm.Submit>
          ) : null
        }
      </resolveEraserForm.State>

      <resolveSketchpadForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <resolveSketchpadForm.Submit className={PRIMARY_BUTTON}>
              {selectedCount > 0
                ? `Discard ${selectedCount} & draw`
                : "Discard nothing"}
            </resolveSketchpadForm.Submit>
          ) : null
        }
      </resolveSketchpadForm.State>

      <playAllTreasuresForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <playAllTreasuresForm.Submit className={SECONDARY_BUTTON}>
              Play treasures
            </playAllTreasuresForm.Submit>
          ) : null
        }
      </playAllTreasuresForm.State>

      <endActionPhaseForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <endActionPhaseForm.Submit
              className={
                endActionLabel === "End actions"
                  ? SECONDARY_BUTTON
                  : PRIMARY_BUTTON
              }
            >
              {endActionLabel}
            </endActionPhaseForm.Submit>
          ) : null
        }
      </endActionPhaseForm.State>

      <endTurnForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <endTurnForm.Submit className={PRIMARY_BUTTON}>
              End turn
            </endTurnForm.Submit>
          ) : null
        }
      </endTurnForm.State>

      <checkGameEndForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <checkGameEndForm.Submit className={PRIMARY_BUTTON}>
              Continue
            </checkGameEndForm.Submit>
          ) : null
        }
      </checkGameEndForm.State>

      <gameOverForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <gameOverForm.Submit className={PRIMARY_BUTTON}>
              Finish
            </gameOverForm.Submit>
          ) : null
        }
      </gameOverForm.State>
    </div>
  );
}
