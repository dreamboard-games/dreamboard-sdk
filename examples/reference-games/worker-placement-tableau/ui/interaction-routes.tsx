import {
  Interaction,
  type BoardSurface,
  type InteractionRoutes,
} from "../shared/generated/ui-contract";

export function MosaicInteractionRoutes({
  actionBoard,
}: {
  actionBoard: BoardSurface<"action-board">;
}) {
  const placeWorker = Interaction.useForm("placement.placeWorker");
  const passPlacement = Interaction.useForm("placement.passPlacement");
  const routes = {
    "setup.submit": { collect: {} },
    "placement.submit": { collect: {} },
    "placement.placeWorker": {
      collect: {
        workerId: placeWorker.slot.workerId,
        spaceId: actionBoard.slot.space,
        give: placeWorker.slot.give,
        receive: placeWorker.slot.receive,
        itemType: placeWorker.slot.itemType,
        cellId: placeWorker.slot.cellId,
      },
    },
    "placement.passPlacement": { collect: {} },
    "cleanup.submit": { collect: {} },
    "scoring.submit": { collect: {} },
    "gameOver.submit": { collect: {} },
  } satisfies InteractionRoutes;

  return (
    <section className="action-form" aria-labelledby="action-heading">
      <Interaction.Routes routes={routes} />
      <h2 id="action-heading">Workshop action</h2>
      <placeWorker.State unavailable={null}>
        {(state) => (
          <div
            className="form-fields"
            data-place-worker-available={state.available}
          >
            <p>
              Choose one unused worker, then a highlighted site. Exchange and
              craft choices appear in the same atomic action.
            </p>
            <placeWorker.slot.workerId.Field />
            <placeWorker.slot.give.Field />
            <placeWorker.slot.receive.Field />
            <placeWorker.slot.itemType.Field />
            <placeWorker.slot.cellId.Field />
            <placeWorker.Submit
              className="primary-button"
              disabled={!state.available}
            >
              Place worker and resolve
            </placeWorker.Submit>
          </div>
        )}
      </placeWorker.State>
      <passPlacement.State unavailable={null}>
        {(state) => (
          <passPlacement.Submit
            className="pass-button"
            disabled={!state.available}
          >
            Pass for this season
          </passPlacement.Submit>
        )}
      </passPlacement.State>
    </section>
  );
}
