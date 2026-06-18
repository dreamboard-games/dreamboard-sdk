import { defineRankingBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRankingBranch({
  id: "multiplayer-ranking-and-ties.draft-stall.true-tie.desktop",
  key: "trueTie",
  assertion: "true tie branch keeps equal first-place players at rank one",
  sourceFile:
    "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/true-tie.scenario.mjs",
});
