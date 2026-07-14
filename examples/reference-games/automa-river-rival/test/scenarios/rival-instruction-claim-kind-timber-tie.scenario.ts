import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-timber-tie",
  seed: 3,
  commands: RIVAL_BRANCH_COMMANDS.claimKindTimberTie,
  round: 6,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 6,
    instructionId: "claim-kind-timber",
    instructionKind: "claimKind",
    cargoKind: "timber",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 6,
    cargoId: "timber-3-2",
    cargoKind: "timber",
    value: 3,
    position: 1,
    rivalProgress: 14,
  },
});
