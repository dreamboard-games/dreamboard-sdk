import { defineRankingBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRankingBranch({
  id: "multiplayer-ranking-and-ties.draft-stall.reconnect.desktop",
  key: "scorelessCancellation",
  assertion:
    "reconnect branch preserves scoreless cancellation outcome evidence",
  sourceFile:
    "examples/reference-games/multiplayer-ranking-and-ties/src/scenarios/reconnect.scenario.mjs",
});
