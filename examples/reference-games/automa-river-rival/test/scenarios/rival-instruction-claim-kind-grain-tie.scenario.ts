import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-grain-tie",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimKindGrainTie,
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
    cargoId: "grain-1-2",
    cargoKind: "grain",
    value: 1,
    position: 1,
    rivalProgress: 13,
  },
});
