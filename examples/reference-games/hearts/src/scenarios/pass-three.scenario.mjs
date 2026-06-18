import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import coverage from "../../scenarios/coverage.json" with { type: "json" };

export const scenario = defineUIScenario({
  id: coverage.scenarioId,
  title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
  contracts: [],
  capabilities: [],
  sourceFiles: [
    "examples/reference-games/hearts/scenarios/coverage.json",
    "examples/reference-games/hearts/src/reference-game.mjs",
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
  },
  replay: [],
});
