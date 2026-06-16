import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "hex-network-trading",
  displayName: "Hex Network Trading",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  board: {
    topology: "hex",
    spaces: ["forest-1", "ore-2", "river-3", "market-4"],
    edges: ["forest-1:ore-2", "ore-2:river-3", "river-3:market-4"],
  },
  resourceHand: {
    lumber: 2,
    fiber: 1,
    ore: 1,
    grain: 0,
  },
  interactions: [
    {
      id: "place-route",
      input: "choose-edge",
      target: "hex-board",
      confirmation: "route-cost",
    },
    {
      id: "offer-trade",
      input: "resource-exchange",
      target: "trade-panel",
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
