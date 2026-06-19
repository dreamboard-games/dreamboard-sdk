import behaviorScenario from "../scenarios/placement-ready-lumberyard.scenario.ts";

export const scenario = {
  id: "worker-placement-tableau.place-worker.desktop",
  title: "Worker Placement Tableau: place a worker on an action space",
  behaviorScenario,
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["click", "runtime-submit", "worker-targets", "multi-step"],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/reference-game.json",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/app/game.ts",
    "examples/reference-games/worker-placement-tableau/app/phases/placement/worker-placement.ts",
    "examples/reference-games/worker-placement-tableau/ui/App.tsx",
    "examples/reference-games/worker-placement-tableau/ui/interaction-routes.tsx",
    "examples/reference-games/worker-placement-tableau/test/scenarios/placement-ready-lumberyard.scenario.ts",
    "examples/reference-games/worker-placement-tableau/test/ui-scenarios/place-worker.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [
    {
      kind: "board-space",
      interactionId: "placeWorker",
      inputKey: "spaceId",
      spaceId: "lumberyard",
      assertIntermediateSemantic: false,
      choices: [
        {
          inputKey: "componentId",
          value: "apprentice-p1-1",
        },
      ],
      params: {
        componentId: "apprentice-p1-1",
        spaceId: "lumberyard",
      },
    },
  ],
} as const;

export default scenario;
