import {
  Interaction,
  type CardCollectionSurface,
} from "../shared/generated/ui-contract";

export function RiverGuildInteractionRoutes({
  river,
}: {
  river: CardCollectionSurface<readonly ["river"]>;
}) {
  return (
    <Interaction.Routes
      routes={{
        "setup.submit": { collect: {} },
        "humanTurn.claimCargo": {
          collect: { cargoId: river.slot.card },
        },
        "humanTurn.submit": { collect: {} },
        "resolveRival.submit": { collect: {} },
        "advanceRiverRound.submit": { collect: {} },
        "gameOver.submit": { collect: {} },
      }}
    />
  );
}
