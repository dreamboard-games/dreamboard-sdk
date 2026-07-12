import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-highest-tie",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimHighestTie,
  round: 1,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 1,
    instructionId: "claim-highest-1",
    instructionKind: "claimHighest",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 1,
    cargoId: "ore-2-3",
    cargoKind: "ore",
    value: 2,
    position: 1,
    rivalProgress: 2,
  },
});
