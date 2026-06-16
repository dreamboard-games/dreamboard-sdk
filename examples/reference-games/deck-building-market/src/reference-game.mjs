import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "deck-building-market",
  displayName: "Deck Building Market",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  zones: {
    hand: ["coin", "coin", "spark"],
    market: ["map-maker", "archive", "guild-contact", "courier"],
    discard: [],
  },
  interactions: [
    {
      id: "buy-card",
      input: "select-market-card",
      costSource: "hand",
      target: "market-row",
    },
    {
      id: "play-hand-action",
      input: "choose-hand-card",
      target: "action-panel",
    },
    {
      id: "end-turn",
      input: "confirm",
      target: "turn-summary",
    },
  ],
  coverage,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      interactions: referenceGame.interactions.length,
    }),
  );
}
