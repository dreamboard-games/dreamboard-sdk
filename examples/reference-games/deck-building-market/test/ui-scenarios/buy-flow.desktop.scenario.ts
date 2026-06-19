import behaviorScenario from "../scenarios/player-two-buy-ready.scenario.ts";

export const scenario = {
  id: "deck-building-market.buy-flow.desktop",
  title: "Deck Building Market: desktop market buy flow",
  behaviorScenario,
  contracts: [
    "Card",
    "CardCollection",
    "InteractionSubmit",
    "PluginRuntime",
    "Resource",
  ],
  capabilities: ["click", "runtime-submit", "market-row", "card-target"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/reference-game.json",
    "examples/reference-games/deck-building-market/rule.md",
    "examples/reference-games/deck-building-market/manifest.ts",
    "examples/reference-games/deck-building-market/app/game.ts",
    "examples/reference-games/deck-building-market/app/phases/player-turn/index.ts",
    "examples/reference-games/deck-building-market/app/phases/player-turn/interactions/buy.ts",
    "examples/reference-games/deck-building-market/ui/App.tsx",
    "examples/reference-games/deck-building-market/ui/interaction-routes.tsx",
    "examples/reference-games/deck-building-market/ui/surfaces.ts",
    "examples/reference-games/deck-building-market/test/scenarios/player-two-buy-ready.scenario.ts",
    "examples/reference-games/deck-building-market/test/ui-scenarios/buy-flow.desktop.scenario.ts",
  ],
  viewer: {
    seatId: "player-2",
    playerId: "player-2",
  },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [
    {
      kind: "card-target",
      interactionId: "buyCard",
      inputKey: "cardId",
      cardId: "brainstorm-6",
    },
  ],
} as const;

export default scenario;
