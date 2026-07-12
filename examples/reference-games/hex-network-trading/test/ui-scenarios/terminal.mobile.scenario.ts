export default {
  id: "hex-network-trading.terminal.mobile",
  title: "Stormtrail: fourth-camp victory",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 1 },
  contracts: ["Board.HexGrid", "Panel", "PluginRuntime"],
  capabilities: ["competition-ranking", "terminal-outcome", "touch"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/app/phases/main.ts",
    "examples/reference-games/hex-network-trading/app/phases/game-over.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;
