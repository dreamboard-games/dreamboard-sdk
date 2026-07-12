export const scenario = {
  id: "roll-and-write-scorecard.mark-cell.mobile",
  title: "Cloudline Survey: mobile survey-cell selection",
  behaviorScenario: "../scenarios/multiple-matches.scenario.ts",
  at: { segment: "given", completed: 0 },
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "SquareGrid"],
  capabilities: ["touch", "runtime-submit", "square-board-targets"],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/reference-game.json",
    "examples/reference-games/roll-and-write-scorecard/rule.md",
    "examples/reference-games/roll-and-write-scorecard/manifest.ts",
    "examples/reference-games/roll-and-write-scorecard/app/game.ts",
    "examples/reference-games/roll-and-write-scorecard/app/model.ts",
    "examples/reference-games/roll-and-write-scorecard/app/phases/mark-survey.ts",
    "examples/reference-games/roll-and-write-scorecard/ui/App.tsx",
    "examples/reference-games/roll-and-write-scorecard/test/scenarios/multiple-matches.scenario.ts",
    "examples/reference-games/roll-and-write-scorecard/test/ui-scenarios/mark-cell.mobile.scenario.ts",
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
      spaceId: "cell-1-0",
    },
  ],
} as const;

export default scenario;
