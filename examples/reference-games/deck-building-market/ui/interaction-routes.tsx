import {
  Interaction,
  type InteractionRoutes,
} from "../shared/generated/ui-contract";
import type { SketchbookSurfaces } from "./surfaces";

export const SECONDARY_BUTTON =
  "rounded-xl border-2 border-stone-700 bg-[#fffdf7] px-4 py-2 text-sm font-bold text-stone-800 disabled:cursor-not-allowed disabled:opacity-40";
export const PRIMARY_BUTTON =
  "rounded-xl border-2 border-stone-800 bg-rose-400 px-4 py-2 text-sm font-bold text-stone-950 shadow-[3px_3px_0_#292524] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

type RouteSurfaces = Pick<SketchbookSurfaces, "hand" | "market">;

export function SketchbookRoutes({ hand, market }: RouteSurfaces) {
  const routes = {
    "playerTurn.brainstorm": { collect: { cardId: hand.slot.card } },
    "playerTurn.studio": { collect: { cardId: hand.slot.card } },
    "playerTurn.gallery": { collect: { cardId: hand.slot.card } },
    "playerTurn.eraser": { collect: { cardId: hand.slot.card } },
    "playerTurn.studioVisit": { collect: { cardId: hand.slot.card } },
    "playerTurn.resolveEraser": { collect: { cardIds: hand.slot.card } },
    "playerTurn.resolveStudioVisit": {
      collect: { cardId: market.slot.card },
    },
    "playerTurn.endActionStep": { collect: {} },
    "playerTurn.playInspiration": { collect: { cardId: hand.slot.card } },
    "playerTurn.buyCard": { collect: { cardId: market.slot.card } },
    "playerTurn.endTurn": { collect: {} },
  } satisfies InteractionRoutes;

  return <Interaction.Routes routes={routes} />;
}

export function SketchbookActions() {
  const endActions = Interaction.useForm("playerTurn.endActionStep");
  const resolveEraser = Interaction.useForm("playerTurn.resolveEraser");
  const endTurn = Interaction.useForm("playerTurn.endTurn");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <resolveEraser.State unavailable={null}>
        {(state) =>
          state.available ? (
            <resolveEraser.Submit className={PRIMARY_BUTTON}>
              Confirm Eraser
            </resolveEraser.Submit>
          ) : null
        }
      </resolveEraser.State>
      <endActions.State unavailable={null}>
        {(state) =>
          state.available ? (
            <endActions.Submit className={SECONDARY_BUTTON}>
              Continue to buy
            </endActions.Submit>
          ) : null
        }
      </endActions.State>
      <endTurn.State unavailable={null}>
        {(state) =>
          state.available ? (
            <endTurn.Submit className={PRIMARY_BUTTON}>
              Clean up & end turn
            </endTurn.Submit>
          ) : null
        }
      </endTurn.State>
    </div>
  );
}
