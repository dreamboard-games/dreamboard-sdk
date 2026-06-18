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
    "CardFace",
    "HandView",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
  ],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/hearts/scenarios/coverage.json",
    "examples/reference-games/hearts/src/reference-game.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
    "examples/reference-games/shared/reference-ui.mjs",
    "examples/reference-games/hearts/src/scenarios/pass-three.scenario.mjs",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch"],
  },
  authority: {
    kind: "reducer",
    referenceGame,
    coverage,
    ...reducerScenario,
  },
  replay: [],
});
