export default {
  id: "hex-network-trading.setup.desktop",
  title: "Stormtrail: choose an opening camp",
  behaviorScenario: "../scenarios/topology-and-setup.scenario.ts",
  at: { segment: "setup", completed: 0 },
  contracts: ["Board.HexGrid", "InteractionSubmit", "PluginRuntime"],
  capabilities: ["hex-board-targets", "keyboard", "normal-setup"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/rule.md",
    "examples/reference-games/hex-network-trading/app/phases/setup-camp.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/ui/interaction-routes.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/topology-and-setup.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;
