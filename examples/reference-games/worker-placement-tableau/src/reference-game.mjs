import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "worker-placement-tableau",
  displayName: "Worker Placement Tableau",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  workers: {
    available: 3,
    placed: [],
  },
  tableau: ["kiln", "loom", "workbench"],
  interactions: [
    {
      id: "place-worker",
      input: "choose-worker-target",
      target: "town-board",
      confirmation: "placement-dialog",
    },
    {
      id: "allocate-resources",
      input: "resource-form",
      target: "craft-order",
    },
    {
      id: "complete-order",
      input: "confirm",
      target: "tableau-card",
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
