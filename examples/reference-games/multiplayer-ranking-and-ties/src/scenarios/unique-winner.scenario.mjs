import { defineRankingBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRankingBranch({
  id: "multiplayer-ranking-and-ties.draft-stall.unique-winner.desktop",
  key: "uniqueWinner",
  assertion: "unique winner branch projects reducer-owned first-place evidence",
  sourceFile:
    "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/unique-winner.scenario.mjs",
});
