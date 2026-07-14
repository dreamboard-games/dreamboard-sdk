import {
  Interaction,
  type CardCollectionSurface,
} from "../shared/generated/ui-contract";

export function HarborFairInteractionRoutes({
  market,
}: {
  market: CardCollectionSurface<readonly ["market"]>;
}) {
  return (
    <Interaction.Routes
      routes={{
        "setup.submit": { collect: {} },
        "drafting.draftStall": {
          collect: { stallId: market.slot.card },
        },
        "drafting.submit": { collect: {} },
        "gameOver.submit": { collect: {} },
      }}
    />
  );
}
