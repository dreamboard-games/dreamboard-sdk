export const scenario = {
  id: "solo-countdown-puzzle.reconnect.mobile",
  title: "Solo Countdown Puzzle: reconnect event history",
  behaviorScenario: "test/scenarios/reconnect.scenario.ts",
  contracts: ["GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["event-log", "reconnect"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/app/phases/resolve-weather.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/reconnect.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/reconnect.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export const reconnectMobileScenario = scenario;
export default scenario;
