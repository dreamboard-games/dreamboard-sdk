import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-ore-highest",
  seed: 1,
  commands: RIVAL_BRANCH_COMMANDS.claimKindOreHighest,
  round: 3,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 3,
    instructionId: "claim-kind-ore",
    instructionKind: "claimKind",
    cargoKind: "ore",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 3,
    cargoId: "ore-3-3",
    cargoKind: "ore",
    value: 3,
    position: 0,
    rivalProgress: 9,
  },
});
