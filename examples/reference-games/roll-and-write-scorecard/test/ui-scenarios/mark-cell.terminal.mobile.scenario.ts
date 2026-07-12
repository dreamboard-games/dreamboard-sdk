export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.terminal.mobile",
  title: "Cloudline Survey: terminal mobile scoring evidence",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 3 },
  contracts: ["Panel", "SquareGrid"],
  capabilities: ["scorecard-grid", "terminal-outcome"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/complete-game.scenario.ts",
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
