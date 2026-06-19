import behaviorScenario from "../scenarios/terminal.scenario.ts";

export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.terminal.mobile",
  title: "Roll And Write Scorecard: terminal mobile scoring evidence",
  behaviorScenario,
  contracts: ["Panel", "SquareGrid"],
  capabilities: ["scorecard-grid", "terminal-outcome"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/terminal.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.terminal.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
