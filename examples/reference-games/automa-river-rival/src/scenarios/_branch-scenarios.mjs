import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import baseCoverage from "../../scenarios/coverage.json" with { type: "json" };
import { createReferenceReducerScenario } from "../../../shared/reference-reducer.mjs";

const sharedSourceFiles = [
  "examples/reference-games/automa-river-rival/scenarios/coverage.json",
  "examples/reference-games/automa-river-rival/src/reference-game.mjs",
  "examples/reference-games/automa-river-rival/src/ui.mjs",
  "examples/reference-games/automa-river-rival/src/scenarios/_branch-scenarios.mjs",
  "examples/reference-games/shared/reference-reducer.mjs",
];

function coverageFor({
  id,
  key,
  assertion,
  initialSystemEventProcedureIds = [],
}) {
  return {
    ...baseCoverage,
    scenarioId: id,
    scenarioKey: key,
    assertions: [assertion],
    initialSystemEventProcedureIds,
  };
}

export function defineAutomaRiverBranch(options) {
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
    contracts: ["GameEventLog", "InteractionSubmit", "Panel"],
    capabilities: ["event-log"],
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
