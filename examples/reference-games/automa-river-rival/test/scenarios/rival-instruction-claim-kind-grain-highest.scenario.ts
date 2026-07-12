import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-grain-highest",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimKindGrainHighest,
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
    cargoId: "grain-2-1",
    cargoKind: "grain",
    value: 2,
    position: 2,
    rivalProgress: 14,
  },
});
