import { defineUIScenario } from "@dreamboard-games/sdk/testing";
import { referenceGame } from "../reference-game.mjs";
import baseCoverage from "../../scenarios/coverage.json" with { type: "json" };
import { createReferenceReducerScenario } from "../../../shared/reference-reducer.mjs";

const sharedSourceFiles = [
  "examples/reference-games/multiplayer-ranking-and-ties/scenarios/coverage.json",
  "examples/reference-games/multiplayer-ranking-and-ties/src/reference-game.mjs",
  "examples/reference-games/multiplayer-ranking-and-ties/src/ui.mjs",
  "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/_branch-scenarios.mjs",
  "examples/reference-games/shared/reference-reducer.mjs",
];

function coverageFor({ id, key, assertion }) {
  return {
    ...baseCoverage,
    scenarioId: id,
    scenarioKey: key,
    assertions: [assertion],
  };
}

export function defineRankingBranch(options) {
  const coverage = coverageFor(options);
  const reducerScenario = createReferenceReducerScenario({
    referenceGame,
    coverage,
    playerIds: ["player-1", "player-2", "player-3", "player-4"],
  });
  const sourceFiles = options.sourceFile
    ? [...sharedSourceFiles, options.sourceFile]
    : sharedSourceFiles;
  return defineUIScenario({
    id: coverage.scenarioId,
    title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
    contracts: ["InteractionSubmit", "OutcomeDialog", "StandingsTable"],
    capabilities: ["terminal-outcome", "score-breakdown", "tie-breaks"],
    sourceFiles,
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
}
