import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-timber-absent",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimKindTimberAbsent,
  round: 4,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 4,
    instructionId: "claim-kind-timber",
    instructionKind: "claimKind",
    cargoKind: "timber",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 4,
    cargoId: "grain-3-1",
    cargoKind: "grain",
    value: 3,
    position: 0,
    rivalProgress: 12,
  },
});
