export default {
  id: "hex-network-trading.bandits.desktop",
  title: "Stormtrail: committed Bandits choices",
  behaviorScenario: "../scenarios/bandits.scenario.ts",
  at: "ready-to-move",
  contracts: ["Board.HexGrid", "InteractionSubmit", "PluginRuntime"],
  capabilities: ["committed-steps", "private-choice", "cancel"],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;
