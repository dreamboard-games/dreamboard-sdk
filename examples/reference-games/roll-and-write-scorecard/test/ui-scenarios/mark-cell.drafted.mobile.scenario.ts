import behaviorScenario from "../scenarios/drafted.scenario.ts";

export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.drafted.mobile",
  title: "Roll And Write Scorecard: drafted mobile mark preview",
  behaviorScenario,
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "SquareGrid"],
  capabilities: ["touch", "drafted-mark", "square-board-targets"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/app/phases/mark-survey.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/drafted.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.drafted.mobile.scenario.ts",
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
