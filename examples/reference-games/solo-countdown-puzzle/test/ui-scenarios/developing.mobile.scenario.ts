export const scenario = {
  id: "solo-countdown-puzzle.developing.mobile",
  title: "Last Light: developing beacon puzzle",
  behaviorScenario: "../scenarios/complete-game-loss-storm.scenario.ts",
  at: "developing",
  contracts: ["Board.Space", "GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["event-history", "resource-pressure", "touch"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/complete-game-loss-storm.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/developing.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
