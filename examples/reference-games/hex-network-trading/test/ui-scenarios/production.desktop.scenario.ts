export default {
  id: "hex-network-trading.production.desktop",
  title: "Stormtrail: first provisions production",
  behaviorScenario: "../scenarios/production.scenario.ts",
  at: "produced",
  contracts: ["Board.HexGrid", "GameEventLog", "PluginRuntime"],
  capabilities: ["production-history", "private-resources", "seeded-dice"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/app/phases/roll.ts",
    "examples/reference-games/hex-network-trading/app/player-view.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/production.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;
