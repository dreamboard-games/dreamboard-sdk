import behaviorScenario from "../scenarios/initial.scenario.ts";

export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.initial.mobile",
  title: "Roll And Write Scorecard: initial mobile scorecard",
  behaviorScenario,
  contracts: ["Panel", "SquareGrid"],
  capabilities: ["scorecard-grid"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/initial.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.initial.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
