export default {
  id: "hex-network-trading.growing-network.desktop",
  title: "Stormtrail: three-camp network under construction",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "growing-network",
  contracts: ["Board.HexGrid", "Panel", "PluginRuntime"],
  capabilities: ["multi-turn-history", "network-growth", "public-board"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/app/phases/main.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;
