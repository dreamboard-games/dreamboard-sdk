import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-grain-absent",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimKindGrainAbsent,
  round: 5,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 5,
    instructionId: "claim-kind-grain",
    instructionKind: "claimKind",
    cargoKind: "grain",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 5,
    cargoId: "timber-2-3",
    cargoKind: "timber",
    value: 2,
    position: 0,
    rivalProgress: 14,
  },
});
