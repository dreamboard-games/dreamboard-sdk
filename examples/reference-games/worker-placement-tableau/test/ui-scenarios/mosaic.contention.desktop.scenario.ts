export default {
  id: "worker-placement-tableau.contention.desktop",
  title: "Mosaic Workshop: master shares the bench",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 7 },
  contracts: [
    "Board.Space",
    "InteractionSubmit",
    "InteractionInput",
    "PluginRuntime",
  ],
  capabilities: [
    "ordinary-master-sharing",
    "worker-contention",
    "dependent-craft",
  ],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/app/phases/placement/index.ts",
    "examples/reference-games/worker-placement-tableau/ui/App.tsx",
    "examples/reference-games/worker-placement-tableau/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium", "webkit"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;
