import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "deck-building-market",
  displayName: "Deck Building Market",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  guidance: {
    phase: {
      id: "playerTurn",
      label: "Build your deck",
      summary:
        "Use hand resources to buy market cards or prepare hand actions.",
      objective:
        "Improve future turns by adding useful market cards before ending the turn.",
    },
  },
  zones: {
    hand: ["coin", "coin", "spark"],
    market: ["map-maker", "archive", "guild-contact", "courier"],
    discard: [],
  },
  interactions: [
    {
      id: "buy-card",
      label: "Buy card",
      input: "select-market-card",
      costSource: "hand",
      target: "market-row",
    },
    {
      id: "play-hand-action",
      label: "Play hand action",
      input: "choose-hand-card",
      target: "action-panel",
    },
    {
      id: "end-turn",
      label: "End turn",
      input: "confirm",
      target: "turn-summary",
    },
  ],
  coverage,
};

if (
  typeof process !== "undefined" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      interactions: referenceGame.interactions.length,
    }),
  );
}
