export const scenario = {
  id: "solo-countdown-puzzle.repair-beacon.mobile",
  title: "Solo Countdown Puzzle: repair beacon",
  behaviorScenario: "test/scenarios/repair-beacon.scenario.ts",
  contracts: ["Board.Space", "GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["touch", "runtime-submit", "square-board-targets"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/reference-game.json",
    "examples/reference-games/solo-countdown-puzzle/rule.md",
    "examples/reference-games/solo-countdown-puzzle/manifest.ts",
    "examples/reference-games/solo-countdown-puzzle/app/game.ts",
    "examples/reference-games/solo-countdown-puzzle/app/phases/player-turn.ts",
    "examples/reference-games/solo-countdown-puzzle/ui/App.tsx",
    "examples/reference-games/solo-countdown-puzzle/test/scenarios/repair-beacon.scenario.ts",
    "examples/reference-games/solo-countdown-puzzle/test/ui-scenarios/repair-beacon.mobile.scenario.ts",
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
      spaceId: "beacon-north",
    },
  ],
} as const;

export const repairBeaconMobileScenario = scenario;
export default scenario;
