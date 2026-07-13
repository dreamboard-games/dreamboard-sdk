import {
  Interaction,
  type BoardSurface,
  type InteractionRoutes,
} from "../shared/generated/ui-contract";

const buttonClass =
  "min-h-11 rounded-xl border border-amber-700/70 bg-amber-950 px-4 py-2 text-sm font-black text-amber-50 shadow-sm transition enabled:hover:bg-amber-900 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-45";
const fieldPanelClass =
  "grid gap-2 rounded-xl border border-stone-300 bg-stone-50 p-2";

function AvailabilityNote({
  available,
  children,
}: {
  available: boolean;
  children: string;
}) {
  return (
    <p
      className={
        available
          ? "text-sm font-bold text-emerald-800"
          : "text-sm text-stone-500"
      }
    >
      {children}
    </p>
  );
}

export function StormtrailInteractionRoutes({
  board,
}: {
  board: BoardSurface<"frontier">;
}) {
  const placeStartingCamp = Interaction.useForm("setupCamp.placeStartingCamp");
  const placeStartingTrail = Interaction.useForm(
    "setupTrail.placeStartingTrail",
  );
  const rollDice = Interaction.useForm("roll.rollDice");
  const discardSupplies = Interaction.useForm("discardBarrier.discardSupplies");
  const moveBandits = Interaction.useForm("moveBandits.moveBandits");
  const buildTrail = Interaction.useForm("main.buildTrail");
  const buildCamp = Interaction.useForm("main.buildCamp");
  const depotTrade = Interaction.useForm("main.tradeWithSupplyDepot");
  const offerTrade = Interaction.useForm("main.offerTrade");
  const endTurn = Interaction.useForm("main.endTurn");
  const acceptTrade = Interaction.useForm("pendingTrade.acceptTrade");
  const rejectTrade = Interaction.useForm("pendingTrade.rejectTrade");

  const routes = {
    "setupCamp.submit": { collect: {} },
    "setupCamp.placeStartingCamp": {
      collect: { intersectionId: board.slot.vertex },
    },
    "setupTrail.submit": { collect: {} },
    "setupTrail.placeStartingTrail": {
      collect: { edgeId: board.slot.edge },
    },
    "roll.submit": { collect: {} },
    "roll.rollDice": { collect: {} },
    "discardBarrier.submit": { collect: {} },
    "discardBarrier.discardSupplies": {
      collect: { resources: discardSupplies.slot.resources },
    },
    "moveBandits.submit": { collect: {} },
    "moveBandits.moveBandits": {
      collect: {
        hexId: board.slot.space,
        targetPlayerId: moveBandits.slot.targetPlayerId,
      },
    },
    "main.submit": { collect: {} },
    "main.buildTrail": { collect: { edgeId: board.slot.edge } },
    "main.buildCamp": {
      collect: { intersectionId: board.slot.vertex },
    },
    "main.tradeWithSupplyDepot": {
      collect: {
        giveResource: depotTrade.slot.giveResource,
        receiveResource: depotTrade.slot.receiveResource,
      },
    },
    "main.offerTrade": {
      collect: {
        targetPlayerId: offerTrade.slot.targetPlayerId,
        give: offerTrade.slot.give,
        want: offerTrade.slot.want,
      },
    },
    "main.endTurn": { collect: {} },
    "pendingTrade.submit": { collect: {} },
    "pendingTrade.acceptTrade": { collect: {} },
    "pendingTrade.rejectTrade": { collect: {} },
    "gameOver.submit": { collect: {} },
  } satisfies InteractionRoutes;

  return (
    <div className="grid gap-2" data-stormtrail-actions="">
      <Interaction.Routes routes={routes} />

      <placeStartingCamp.State unavailable={null}>
        {(state) => (
          <AvailabilityNote available={state.available}>
            Select a highlighted intersection for your starting camp.
          </AvailabilityNote>
        )}
      </placeStartingCamp.State>
      <placeStartingTrail.State unavailable={null}>
        {(state) => (
          <AvailabilityNote available={state.available}>
            Select a highlighted edge touching your new camp.
          </AvailabilityNote>
        )}
      </placeStartingTrail.State>

      <rollDice.State unavailable={null}>
        {(state) =>
          state.available ? (
            <rollDice.Submit className={buttonClass}>Roll 2d6</rollDice.Submit>
          ) : (
            <button type="button" className={buttonClass} disabled>
              Waiting to roll
            </button>
          )
        }
      </rollDice.State>

      <discardSupplies.State unavailable={null}>
        {(state) => (
          <div className={fieldPanelClass}>
            <strong>Return the required supplies</strong>
            <discardSupplies.slot.resources.Field />
            <discardSupplies.Submit
              className={buttonClass}
              disabled={!state.available}
            >
              Commit private discard
            </discardSupplies.Submit>
          </div>
        )}
      </discardSupplies.State>

      <moveBandits.State unavailable={null}>
        {(state) => (
          <div className={fieldPanelClass}>
            <strong>Move the Bandits</strong>
            <p className="text-sm text-stone-600">
              Choose a highlighted district, then select a victim only when one
              is required.
            </p>
            <moveBandits.slot.targetPlayerId.Field />
            <moveBandits.Submit
              className={buttonClass}
              disabled={!state.available}
            >
              Move Bandits
            </moveBandits.Submit>
          </div>
        )}
      </moveBandits.State>

      <buildTrail.State unavailable={null}>
        {(state) => (
          <AvailabilityNote available={state.available}>
            Build Trail: select a highlighted connected edge (1 Timber + 1
            Brick).
          </AvailabilityNote>
        )}
      </buildTrail.State>
      <buildCamp.State unavailable={null}>
        {(state) => (
          <AvailabilityNote available={state.available}>
            Build Camp: select a highlighted connected intersection (1 of each
            supply).
          </AvailabilityNote>
        )}
      </buildCamp.State>

      <depotTrade.State unavailable={null}>
        {(state) => (
          <div className={fieldPanelClass}>
            <strong>Supply Depot · 3:1</strong>
            <depotTrade.slot.giveResource.Field />
            <depotTrade.slot.receiveResource.Field />
            <depotTrade.Submit
              className={buttonClass}
              disabled={!state.available}
            >
              Exchange supplies
            </depotTrade.Submit>
          </div>
        )}
      </depotTrade.State>

      <offerTrade.State unavailable={null}>
        {(state) => (
          <div className={fieldPanelClass}>
            <strong>Offer a bilateral trade</strong>
            <offerTrade.slot.targetPlayerId.Field />
            <offerTrade.slot.give.Field />
            <offerTrade.slot.want.Field />
            <offerTrade.Submit
              className={buttonClass}
              disabled={!state.available}
            >
              Send offer
            </offerTrade.Submit>
          </div>
        )}
      </offerTrade.State>

      <endTurn.State unavailable={null}>
        {(state) => (
          <endTurn.Submit className={buttonClass} disabled={!state.available}>
            End turn
          </endTurn.Submit>
        )}
      </endTurn.State>

      <acceptTrade.State unavailable={null}>
        {(state) => (
          <acceptTrade.Submit
            className={buttonClass}
            disabled={!state.available}
          >
            Accept trade
          </acceptTrade.Submit>
        )}
      </acceptTrade.State>
      <rejectTrade.State unavailable={null}>
        {(state) => (
          <rejectTrade.Submit
            className={buttonClass}
            disabled={!state.available}
          >
            Reject trade
          </rejectTrade.Submit>
        )}
      </rejectTrade.State>
    </div>
  );
}
