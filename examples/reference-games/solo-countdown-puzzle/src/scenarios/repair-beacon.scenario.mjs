import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import coverage from "../../scenarios/coverage.json" with { type: "json" };
import { createReferenceReducerScenario } from "../../../shared/reference-reducer.mjs";

const reducerScenario = createReferenceReducerScenario({
  referenceGame,
  coverage,
  playerIds: ["player-1"],
});

export const scenario = defineUIScenario({
  id: coverage.scenarioId,
  title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
  contracts: [
    "GameEventLog",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
    "SquareGrid",
  ],
  capabilities: ["click", "runtime-submit"],
  sourceFiles: [
    "examples/reference-games/solo-countdown-puzzle/scenarios/coverage.json",
    "examples/reference-games/solo-countdown-puzzle/src/reference-game.mjs",
    "examples/reference-games/solo-countdown-puzzle/src/ui.mjs",
    "examples/reference-games/solo-countdown-puzzle/src/scenarios/repair-beacon.scenario.mjs",
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
