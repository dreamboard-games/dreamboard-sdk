import behaviorScenario from "../scenarios/build-trail-ready.scenario.ts";

export const scenario = {
  id: "hex-network-trading.build-trail.desktop",
  title: "Hex Network Trading: desktop trail build target",
  behaviorScenario,
  contracts: [
    "Board.HexGrid",
    "InteractionSubmit",
    "PluginRuntime",
    "ResourceCounter",
  ],
  capabilities: ["click", "runtime-submit", "hex-board-targets"],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/reference-game.json",
    "examples/reference-games/hex-network-trading/rule.md",
    "examples/reference-games/hex-network-trading/manifest.ts",
    "examples/reference-games/hex-network-trading/app/game.ts",
    "examples/reference-games/hex-network-trading/app/phases/player-turn/index.ts",
    "examples/reference-games/hex-network-trading/app/phases/player-turn/build.ts",
    "examples/reference-games/hex-network-trading/ui/App.tsx",
    "examples/reference-games/hex-network-trading/ui/frontier-trails-board.tsx",
    "examples/reference-games/hex-network-trading/ui/interaction-routes.tsx",
    "examples/reference-games/hex-network-trading/test/scenarios/build-trail-ready.scenario.ts",
    "examples/reference-games/hex-network-trading/test/ui-scenarios/build-trail.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [
    {
      kind: "board-space",
      interactionId: "buildTrail",
      inputKey: "edgeId",
      spaceId: "hex-edge:-1,-1,2::-2,1,1",
    },
  ],
} as const;

export default scenario;
