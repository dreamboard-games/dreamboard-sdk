import behaviorScenario from "../scenarios/rolled.scenario.ts";

export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.rolled.mobile",
  title: "Roll And Write Scorecard: rolled mobile legal targets",
  behaviorScenario,
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "SquareGrid"],
  capabilities: ["touch", "square-board-targets"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/app/phases/mark-survey.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/rolled.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.rolled.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [
    {
      kind: "board-space",
      interactionId: "markCell",
      inputKey: "cell",
      spaceId: "cell-0-1",
    },
  ],
} as const;

export default scenario;
