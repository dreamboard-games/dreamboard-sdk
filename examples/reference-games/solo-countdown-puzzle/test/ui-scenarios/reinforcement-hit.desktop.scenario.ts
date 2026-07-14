export const scenario = {
  id: "solo-countdown-puzzle.reinforcement-hit.desktop",
  title: "Last Light: sea-wall reinforcement holds",
  behaviorScenario:
    "../scenarios/weather-procedure-north-squall-reinforced.scenario.ts",
  at: "reinforcement-hit",
  contracts: ["Board.Space", "GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["event-history", "keyboard", "runtime-submit"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/app/phases/resolve-weather.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/weather-procedure-north-squall-reinforced.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/reinforcement-hit.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [{ kind: "submit", interactionId: "reinforce" }],
} as const;

export default scenario;
