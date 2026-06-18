import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const referenceGame = {
  id: "worker-placement-tableau",
  displayName: "Worker Placement Tableau",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  guidance: {
    phase: {
      id: "workerTurn",
      label: "Place a worker",
      summary:
        "Assign workers to gather resources and complete tableau orders.",
      objective:
        "Use each worker where it unlocks the strongest order or future resource chain.",
    },
  },
  workers: {
    available: 3,
    placed: [],
  },
  tableau: ["kiln", "loom", "workbench"],
  interactions: [
    {
      id: "place-worker",
      label: "Place worker",
      input: "choose-worker-target",
      target: "town-board",
      confirmation: "placement-dialog",
    },
    {
      id: "allocate-resources",
      label: "Allocate resources",
      input: "resource-form",
      target: "craft-order",
    },
    {
      id: "complete-order",
      label: "Complete order",
      input: "confirm",
      target: "tableau-card",
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
