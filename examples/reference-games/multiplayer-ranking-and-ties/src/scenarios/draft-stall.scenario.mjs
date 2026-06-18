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
  title: `${referenceGame.displayName}: ${coverage.assertions[1]}`,
  contracts: ["InteractionSubmit", "OutcomeDialog", "StandingsTable"],
  capabilities: ["terminal-outcome", "score-breakdown", "tie-breaks"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/scenarios/coverage.json",
    "examples/reference-games/multiplayer-ranking-and-ties/src/reference-game.mjs",
    "examples/reference-games/multiplayer-ranking-and-ties/src/ui.mjs",
    "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/draft-stall.scenario.mjs",
    "examples/reference-games/shared/reference-reducer.mjs",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium", "webkit"],
    input: ["mouse", "keyboard"],
  },
  authority: {
    kind: "reducer",
    referenceGame,
    coverage,
    ...reducerScenario,
  },
  replay: [],
});
