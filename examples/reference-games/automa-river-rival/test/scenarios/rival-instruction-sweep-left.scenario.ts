import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-sweep-left",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.sweepLeft,
  round: 6,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 6,
    instructionId: "sweep-left",
    instructionKind: "sweepLeft",
  },
  resolution: {
    kind: "rival-river-swept",
    round: 6,
    cargoId: "timber-1-2",
    cargoKind: "timber",
    value: 1,
    position: 0,
    progressGain: 1,
    rivalProgress: 15,
  },
});
