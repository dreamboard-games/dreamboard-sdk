import { RIVAL_BRANCH_COMMANDS } from "./commands.ts";
import { defineRivalBranchScenario } from "./rival-branch.ts";

export default defineRivalBranchScenario({
  id: "river-guild.rival-instruction-claim-kind-ore-tie",
  seed: 3,
  commands: RIVAL_BRANCH_COMMANDS.claimKindOreTie,
  round: 5,
  reveal: {
    kind: "rival-instruction-revealed",
    round: 5,
    instructionId: "claim-kind-ore",
    instructionKind: "claimKind",
    cargoKind: "ore",
  },
  resolution: {
    kind: "rival-cargo-claimed",
    round: 5,
    cargoId: "ore-2-1",
    cargoKind: "ore",
    value: 2,
    position: 1,
    rivalProgress: 11,
  },
});
