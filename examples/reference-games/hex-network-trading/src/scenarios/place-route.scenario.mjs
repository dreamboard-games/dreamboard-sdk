import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import coverage from "../../scenarios/coverage.json" with { type: "json" };
import { createReferenceReducerScenario } from "../../../shared/reference-reducer.mjs";

const reducerScenario = createReferenceReducerScenario({
  referenceGame,
  coverage,
});

export const scenario = defineUIScenario({
  id: coverage.scenarioId,
  title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
  contracts: [
    "CardDragSurface",
    "CardDropTargetView",
    "CardFace",
    "CostDisplay",
    "HandView",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
    "ResourceCounter",
  ],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/hex-network-trading/scenarios/coverage.json",
    "examples/reference-games/hex-network-trading/src/reference-game.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
    "examples/reference-games/shared/reference-ui.mjs",
    "examples/reference-games/hex-network-trading/src/scenarios/place-route.scenario.mjs",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
  },
  authority: {
    kind: "reducer",
    referenceGame,
    coverage,
    ...reducerScenario,
  },
  replay: [],
});
