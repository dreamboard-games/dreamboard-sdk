import behaviorScenario from "../scenarios/invalid.scenario.ts";

export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.invalid.mobile",
  title: "Roll And Write Scorecard: mobile invalid target boundary",
  behaviorScenario,
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "SquareGrid"],
  capabilities: ["touch", "disabled-submit", "square-board-targets"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/app/phases/mark-survey.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/invalid.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.invalid.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
