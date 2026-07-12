import {
  Interaction,
  type BoardSurface,
} from "../shared/generated/ui-contract";

const actionClass =
  "min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 transition enabled:hover:border-cyan-300 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

export function LastLightInteractionRoutes({
  beaconGrid,
}: {
  beaconGrid: BoardSurface<"beacon-grid">;
}) {
  const chargeForm = Interaction.useForm("playerTurn.charge");
  const repairBeaconForm = Interaction.useForm("playerTurn.repairBeacon");
  const reinforceForm = Interaction.useForm("playerTurn.reinforce");

  return (
    <>
      <Interaction.Routes
        routes={{
          "setup.submit": { collect: {} },
          "playerTurn.charge": { collect: {} },
          "playerTurn.repairBeacon": {
            collect: { beaconId: beaconGrid.slot.space },
          },
          "playerTurn.reinforce": { collect: {} },
          "playerTurn.submit": { collect: {} },
          "resolveWeather.submit": { collect: {} },
          "advanceCountdown.submit": { collect: {} },
          "gameOver.submit": { collect: {} },
        }}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <chargeForm.State unavailable={null}>
          {(state) =>
            state.available ? (
              <chargeForm.Submit className={actionClass}>
                Charge +2
              </chargeForm.Submit>
            ) : (
              <button className={actionClass} type="button" disabled>
                Charge +2
              </button>
            )
          }
        </chargeForm.State>
        <repairBeaconForm.State unavailable={null}>
          {(state) =>
            state.available ? (
              <repairBeaconForm.Submit className={actionClass}>
                Repair selected −1
              </repairBeaconForm.Submit>
            ) : (
              <button className={actionClass} type="button" disabled>
                Repair selected −1
              </button>
            )
          }
        </repairBeaconForm.State>
        <reinforceForm.State unavailable={null}>
          {(state) =>
            state.available ? (
              <reinforceForm.Submit className={actionClass}>
                Reinforce −2
              </reinforceForm.Submit>
            ) : (
              <button className={actionClass} type="button" disabled>
                Reinforce −2
              </button>
            )
          }
        </reinforceForm.State>
      </div>
    </>
  );
}
