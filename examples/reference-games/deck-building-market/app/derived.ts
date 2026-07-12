import { defineDerived } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../shared/manifest-contract";
import type { GameContract } from "./game-contract";
import { SUPPLY_ZONE_IDS } from "./model";

export const portfolioScores = defineDerived<GameContract>()({
  name: "portfolioScores",
  compute: ({ q }) =>
    Object.fromEntries(
      q.player.order().map((playerId) => {
        let score = 0;
        for (const zoneId of ["deck", "hand", "in-play", "discard"] as const) {
          for (const cardId of q.zone.playerCards(playerId, zoneId)) {
            const properties = q.card.get(cardId).properties;
            const value =
              "portfolioValue" in properties
                ? properties.portfolioValue
                : undefined;
            if (typeof value === "number") score += value;
          }
        }
        return [playerId, score] as const;
      }),
    ) as Record<PlayerId, number>,
});

export const supplyEnding = defineDerived<GameContract>()({
  name: "supplyEnding",
  compute: ({ q }) => {
    const emptyPiles = SUPPLY_ZONE_IDS.filter(
      (zoneId) => q.zone.sharedCards(zoneId).length === 0,
    );
    const masterpieceEmpty = emptyPiles.includes("supply-masterpiece");
    const threePilesEmpty = emptyPiles.length >= 3;
    if (masterpieceEmpty && threePilesEmpty) return "both" as const;
    if (masterpieceEmpty) return "masterpiece" as const;
    if (threePilesEmpty) return "threePiles" as const;
    return null;
  },
});
