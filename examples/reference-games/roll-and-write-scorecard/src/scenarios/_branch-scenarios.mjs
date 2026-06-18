import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import baseCoverage from "../../scenarios/coverage.json" with { type: "json" };
import { createReferenceReducerScenario } from "../../../shared/reference-reducer.mjs";

const sharedSourceFiles = [
  "examples/reference-games/roll-and-write-scorecard/scenarios/coverage.json",
  "examples/reference-games/roll-and-write-scorecard/src/reference-game.mjs",
  "examples/reference-games/roll-and-write-scorecard/src/ui.mjs",
  "examples/reference-games/roll-and-write-scorecard/src/scenarios/_branch-scenarios.mjs",
  "examples/reference-games/shared/reference-reducer.mjs",
];

function coverageFor({ id, key, assertion, replay = baseCoverage.replay }) {
  return {
    ...baseCoverage,
    scenarioId: id,
    scenarioKey: key,
    assertions: [assertion],
    replay,
  };
}

export function defineRollAndWriteBranch(options) {
  const coverage = coverageFor(options);
  const reducerScenario = createReferenceReducerScenario({
    referenceGame,
    coverage,
  });
  const sourceFiles = options.sourceFile
    ? [...sharedSourceFiles, options.sourceFile]
    : sharedSourceFiles;
  return defineUIScenario({
    id: coverage.scenarioId,
    title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
    contracts: ["InteractionSubmit", "Panel", "PluginRuntime", "SquareGrid"],
    capabilities: [],
    sourceFiles,
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
}
