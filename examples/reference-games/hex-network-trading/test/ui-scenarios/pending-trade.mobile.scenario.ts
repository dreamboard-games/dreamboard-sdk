export default {
  id: "hex-network-trading.pending-trade.mobile",
  title: "Stormtrail: respond to one bilateral offer",
  behaviorScenario: "../scenarios/bilateral-trade.scenario.ts",
  at: { segment: "given", completed: 10 },
  contracts: ["InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["pending-response", "public-trade-terms", "touch"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/app/phases/pending-trade.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/ui/interaction-routes.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/bilateral-trade.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;
