export default {
  id: "hex-network-trading.discard-barrier.mobile",
  title: "Stormtrail: private overloaded-supply discard",
  behaviorScenario: "../scenarios/discard-barrier.scenario.ts",
  at: "ready-to-discard",
  contracts: ["InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["multi-actor-barrier", "private-resources", "touch"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/app/phases/discard-barrier.ts",
    "examples/reference-games/hex-network-trading/app/player-view.ts",
    "examples/reference-games/hex-network-trading/ui/interaction-routes.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/discard-barrier.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;
