import { defineRankingBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRankingBranch({
  id: "multiplayer-ranking-and-ties.draft-stall.tie-break.desktop",
  key: "completeSetTieBreak",
  assertion: "tie-break branch projects complete-set evidence before coins",
  sourceFile:
    "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/tie-break.scenario.mjs",
});
