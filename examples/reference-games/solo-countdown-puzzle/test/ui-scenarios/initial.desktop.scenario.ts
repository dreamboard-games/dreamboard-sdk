export const scenario = {
  id: "solo-countdown-puzzle.initial.desktop",
  title: "Last Light: opening lighthouse watch",
  behaviorScenario: "../scenarios/weather-procedure-calm.scenario.ts",
  at: "opening",
  contracts: ["Board.Space", "InteractionSubmit", "Panel", "SquareGrid"],
  capabilities: ["keyboard", "lighthouse-status", "weather-timeline"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/weather-procedure-calm.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/initial.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
