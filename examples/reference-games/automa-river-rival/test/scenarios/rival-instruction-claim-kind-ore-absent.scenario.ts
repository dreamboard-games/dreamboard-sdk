import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-ore-absent",
  seed: 2,
  commands: RIVAL_BRANCH_COMMANDS.claimKindOreAbsent,
  round: 2,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 2,
    instructionId: "claim-kind-ore",
    instructionKind: "claimKind",
    cargoKind: "ore",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 2,
    cargoId: "timber-2-1",
    cargoKind: "timber",
    value: 2,
    position: 0,
    rivalProgress: 5,
  },
});
