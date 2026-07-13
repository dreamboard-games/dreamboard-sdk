export const scenario = {
  id: "solo-countdown-puzzle.terminal.mobile",
  title: "Last Light: all coastal beacons lit",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "developed",
  contracts: ["Board.Space", "GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["terminal-outcome", "touch", "weather-timeline"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/terminal.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [
    {
      kind: "board-space",
      interactionId: "repairBeacon",
      inputKey: "beaconId",
      spaceId: "beacon-south",
    },
  ],
} as const;

export default scenario;
