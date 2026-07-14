import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-highest-unique",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimHighestUnique,
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
    cargoId: "timber-3-2",
    cargoKind: "timber",
    value: 3,
    position: 3,
    rivalProgress: 3,
  },
});
