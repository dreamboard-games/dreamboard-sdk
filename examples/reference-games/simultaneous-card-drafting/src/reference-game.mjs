import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "simultaneous-card-drafting",
  displayName: "Simultaneous Card Drafting",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  guidance: {
    phase: {
      id: "draft",
      label: "Choose and lock",
      summary:
        "Choose one card privately, lock it, then reveal and pass hands.",
      objective:
        "Draft a card that improves your set while anticipating what neighbors need.",
    },
  },
  draftRound: {
    hand: ["lantern", "garden", "bell", "map"],
    lockedChoice: null,
    revealQueue: [],
  },
  interactions: [
    {
      id: "choose-card",
      label: "Choose card",
      input: "select-one-card",
      target: "private-hand",
      lockState: "pending",
    },
    {
      id: "lock-choice",
      label: "Lock choice",
      input: "confirm",
      target: "locked-choice",
    },
    {
      id: "reveal-and-pass",
      label: "Reveal and pass",
      input: "simultaneous-reveal",
      target: "pass-transition",
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
