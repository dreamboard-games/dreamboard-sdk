import type { RiverCargoCardId } from "../../shared/manifest-contract.ts";

export function claim(seat: number, cargoId: RiverCargoCardId) {
  return {
    actor: { seat },
    interactionId: "claimCargo" as const,
    params: { cargoId },
  };
}

export const COMPLETE_GAME_COMMANDS = [
  claim(0, "timber-1-1"),
  claim(1, "timber-2-1"),
  claim(0, "grain-1-1"),
  claim(1, "ore-1-1"),
  claim(0, "grain-1-2"),
  claim(1, "grain-3-1"),
  claim(0, "timber-2-3"),
  claim(1, "timber-3-1"),
  claim(0, "grain-2-3"),
  claim(1, "ore-2-2"),
  claim(0, "timber-3-3"),
  claim(1, "ore-3-1"),
] as const;

export const SOLO_LOSS_COMMANDS = [
  claim(0, "timber-1-1"),
  claim(0, "timber-2-1"),
  claim(0, "ore-1-1"),
  claim(0, "grain-1-2"),
  claim(0, "timber-2-3"),
  claim(0, "ore-2-1"),
] as const;

export const SOLO_DRAW_COMMANDS = [
  claim(0, "timber-1-1"),
  claim(0, "timber-2-1"),
  claim(0, "ore-1-1"),
  claim(0, "grain-2-1"),
  claim(0, "grain-3-1"),
  claim(0, "timber-3-1"),
] as const;

export const SOLO_WIN_COMMANDS = [
  claim(0, "timber-1-1"),
  claim(0, "timber-2-1"),
  claim(0, "ore-2-3"),
  claim(0, "grain-2-1"),
  claim(0, "grain-3-1"),
  claim(0, "timber-3-1"),
] as const;

export const RIVAL_BRANCH_COMMANDS = {
  claimHighestUnique: [claim(0, "timber-1-1")],
  claimHighestTie: [claim(0, "timber-3-2")],
  claimKindTimberHighest: [
    claim(0, "timber-1-1"),
    claim(0, "ore-2-3"),
    claim(0, "ore-1-1"),
    claim(0, "grain-1-2"),
  ],
  claimKindTimberTie: [
    claim(0, "grain-3-3"),
    claim(0, "timber-2-2"),
    claim(0, "timber-1-2"),
    claim(0, "ore-2-1"),
    claim(0, "grain-3-2"),
    claim(0, "grain-3-1"),
  ],
  claimKindTimberAbsent: [
    claim(0, "timber-1-1"),
    claim(0, "timber-2-1"),
    claim(0, "ore-1-1"),
    claim(0, "grain-1-2"),
  ],
  claimKindGrainHighest: [
    claim(0, "timber-1-1"),
    claim(0, "timber-2-1"),
    claim(0, "ore-1-1"),
    claim(0, "grain-1-2"),
    claim(0, "timber-2-3"),
  ],
  claimKindGrainTie: [
    claim(0, "timber-1-1"),
    claim(0, "timber-2-1"),
    claim(0, "ore-2-3"),
    claim(0, "ore-1-1"),
    claim(0, "grain-2-1"),
  ],
  claimKindGrainAbsent: [
    claim(0, "timber-1-1"),
    claim(0, "grain-2-1"),
    claim(0, "timber-2-1"),
    claim(0, "grain-1-2"),
    claim(0, "grain-1-1"),
  ],
  claimKindOreHighest: [
    claim(0, "timber-1-1"),
    claim(0, "timber-2-1"),
    claim(0, "ore-1-1"),
  ],
  claimKindOreTie: [
    claim(0, "grain-3-3"),
    claim(0, "timber-3-2"),
    claim(0, "timber-1-2"),
    claim(0, "timber-2-2"),
    claim(0, "grain-3-2"),
  ],
  claimKindOreAbsent: [claim(0, "ore-3-3"), claim(0, "ore-2-3")],
  sweepLeft: SOLO_LOSS_COMMANDS,
} as const;
