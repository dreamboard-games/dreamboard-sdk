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
    "CostDisplay",
    "InteractionInput",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
    "ResourceCounter",
    "SlotSystem",
  ],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/scenarios/coverage.json",
    "examples/reference-games/worker-placement-tableau/src/reference-game.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
    "examples/reference-games/shared/reference-ui.mjs",
    "examples/reference-games/worker-placement-tableau/src/scenarios/place-worker.scenario.mjs",
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
