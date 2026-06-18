import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "hearts",
  displayName: "Hearts",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  guidance: {
    phase: {
      id: "passing",
      label: "Pass cards",
      summary: "Select three private cards to pass before trick play begins.",
      objective:
        "Reduce hand risk while preserving enough suit coverage for the first trick.",
    },
  },
  players: ["north", "east", "south", "west"],
  initialPrivateHand: [
    "two-clubs",
    "queen-spades",
    "ace-hearts",
    "seven-diamonds",
    "ten-clubs",
  ],
  interactions: [
    {
      id: "pass-three",
      label: "Pass three",
      actor: "south",
      input: "select-three-cards",
      visibility: "private-hand",
      mobileAction: "confirm-pass",
    },
    {
      id: "play-to-trick",
      label: "Play to trick",
      actor: "south",
      input: "choose-card-following-suit",
      target: "shared-trick-area",
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
