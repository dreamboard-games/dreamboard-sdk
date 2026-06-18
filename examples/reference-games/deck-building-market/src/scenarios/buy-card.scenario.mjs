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
  contracts: [],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/deck-building-market/scenarios/coverage.json",
    "examples/reference-games/deck-building-market/src/reference-game.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
    "examples/reference-games/shared/reference-ui.mjs",
    "examples/reference-games/deck-building-market/src/scenarios/buy-card.scenario.mjs",
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
