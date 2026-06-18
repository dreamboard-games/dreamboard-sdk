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
  contracts: ["InteractionSubmit", "Panel", "PluginRuntime", "SquareGrid"],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/roll-and-write-scorecard/scenarios/coverage.json",
    "examples/reference-games/roll-and-write-scorecard/src/reference-game.mjs",
    "examples/reference-games/roll-and-write-scorecard/src/ui.mjs",
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/mark-cell.scenario.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  authority: {
    kind: "reducer",
    referenceGame,
    coverage,
    ...reducerScenario,
  },
  replay: [],
});
