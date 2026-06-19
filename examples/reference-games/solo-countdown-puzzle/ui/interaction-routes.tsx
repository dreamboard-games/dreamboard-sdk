import {
  Interaction,
  type BoardSurface,
} from "../shared/generated/ui-contract.ts";

export function SoloInteractionRoutes({
  beaconGrid,
}: {
  beaconGrid: BoardSurface<"beacon-grid">;
}) {
  const repairBeaconForm = Interaction.useForm("playerTurn.repairBeacon");

  return (
    <>
      <Interaction.Routes
        routes={{
          "playerTurn.repairBeacon": {
            collect: {
              beaconId: beaconGrid.slot.space,
            },
          },
          "playerTurn.submit": {
            collect: {},
          },
          "resolveWeather.submit": {
            collect: {},
          },
          "advanceCountdown.submit": {
            collect: {},
          },
          "gameOver.submit": {
            collect: {},
          },
        }}
      />
      <repairBeaconForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <repairBeaconForm.Submit>Repair beacon</repairBeaconForm.Submit>
          ) : null
        }
      </repairBeaconForm.State>
    </>
  );
}
