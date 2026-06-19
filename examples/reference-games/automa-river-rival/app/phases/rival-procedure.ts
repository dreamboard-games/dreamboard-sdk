import {
  gameEvent,
  type GameEvent,
  type GameOutcome,
} from "@dreamboard-games/sdk/reducer";
import type { Cargo, PublicState, RivalInstruction } from "../game-contract";

export const riverCards = [
  { id: "timber-1-1", kind: "timber", value: 1 },
  { id: "ore-2-1", kind: "ore", value: 2 },
  { id: "grain-3-1", kind: "grain", value: 3 },
  { id: "timber-3-1", kind: "timber", value: 3 },
] as const satisfies readonly Cargo[];

export const cargoSupply = [
  { id: "grain-1-2", kind: "grain", value: 1 },
  { id: "ore-1-2", kind: "ore", value: 1 },
  { id: "timber-2-2", kind: "timber", value: 2 },
  { id: "grain-2-2", kind: "grain", value: 2 },
  { id: "ore-3-2", kind: "ore", value: 3 },
  { id: "timber-1-3", kind: "timber", value: 1 },
  { id: "grain-3-3", kind: "grain", value: 3 },
  { id: "ore-2-3", kind: "ore", value: 2 },
] as const satisfies readonly Cargo[];

export const rivalInstructions = [
  { id: "claim-highest-1", kind: "claimHighest" },
  { id: "claim-kind-ore-1", kind: "claimKind", cargoKind: "ore" },
  { id: "sweep-left-1", kind: "sweepLeft" },
  { id: "claim-kind-grain-1", kind: "claimKind", cargoKind: "grain" },
  { id: "claim-highest-2", kind: "claimHighest" },
  { id: "sweep-left-2", kind: "sweepLeft" },
] as const satisfies readonly RivalInstruction[];

export function createInitialPublicState(): PublicState {
  return {
    round: 1,
    river: [...riverCards],
    supply: [...cargoSupply],
    rivalDeck: [...rivalInstructions],
    rivalProgress: 0,
    teamScore: 0,
    eventLog: [],
    processedClaims: {},
    outcome: null,
  };
}

function byHighestCargo(left: Cargo, right: Cargo): number {
  if (right.value !== left.value) return right.value - left.value;
  return left.id.localeCompare(right.id);
}

export function chooseRivalCargo(
  river: readonly Cargo[],
  instruction: RivalInstruction,
): Cargo | null {
  if (river.length === 0) return null;
  if (instruction.kind === "claimKind") {
    return (
      river.find((card) => card.kind === instruction.cargoKind) ?? river[0]!
    );
  }
  if (instruction.kind === "sweepLeft") {
    return river[0]!;
  }
  return [...river].sort(byHighestCargo)[0]!;
}

function refillRiver({
  river,
  supply,
}: {
  river: readonly Cargo[];
  supply: readonly Cargo[];
}): { river: Cargo[]; supply: Cargo[] } {
  const nextRiver = [...river];
  const nextSupply = [...supply];
  while (nextRiver.length < 4 && nextSupply.length > 0) {
    nextRiver.push(nextSupply.shift()!);
  }
  return { river: nextRiver, supply: nextSupply };
}

export function cooperativeOutcome({
  teamScore,
  rivalProgress,
}: {
  teamScore: number;
  rivalProgress: number;
}): GameOutcome<string> {
  const result =
    teamScore > rivalProgress
      ? "win"
      : teamScore === rivalProgress
        ? "draw"
        : "loss";
  return {
    reason: {
      code: `cooperative-${result}`,
      message:
        result === "win"
          ? "The team outscored the river rival."
          : result === "draw"
            ? "The team held the river rival to a draw."
            : "The river rival outscored the team.",
    },
    standings: [
      {
        playerId: "player-1",
        rank: result === "loss" ? 2 : 1,
        result,
        score: teamScore,
        scoreBreakdown: [
          { id: "team-cargo", label: "Team cargo", value: teamScore },
          {
            id: "rival-progress",
            label: "Rival progress",
            value: rivalProgress,
          },
        ],
        tieBreaks: [],
      },
    ],
  };
}

export function resolveRivalProcedure(publicState: PublicState): {
  publicState: PublicState;
  events: GameEvent[];
  claimed: Cargo | null;
  instruction: RivalInstruction | null;
} {
  const [instruction, ...remainingDeck] = publicState.rivalDeck;
  if (!instruction) {
    return {
      publicState,
      events: [],
      claimed: null,
      instruction: null,
    };
  }

  const claimed = chooseRivalCargo(publicState.river, instruction);
  const riverAfterClaim = claimed
    ? publicState.river.filter((card: Cargo) => card.id !== claimed.id)
    : publicState.river;
  const refilled = refillRiver({
    river: riverAfterClaim,
    supply: publicState.supply,
  });
  const summary =
    instruction.kind === "claimKind"
      ? `${instruction.kind}:${instruction.cargoKind}`
      : instruction.kind;
  const round = publicState.round;
  const events = [
    gameEvent.systemAction({
      procedureId: "rival-instruction-revealed",
      title: "Rival instruction revealed",
      summary,
      details: [{ label: "Round", value: round }],
    }),
    gameEvent.systemAction({
      procedureId: "rival-cargo-claimed",
      title: "Rival cargo claimed",
      summary: claimed?.id ?? "none",
      details: [{ label: "Progress", value: claimed?.value ?? 0 }],
    }),
    gameEvent.systemAction({
      procedureId: "river-refilled",
      title: "River refilled",
      summary: "The river market refilled deterministically.",
      details: [{ label: "River size", value: refilled.river.length }],
    }),
    gameEvent.systemAction({
      procedureId: "river-round-advanced",
      title: "Round advanced",
      summary:
        round >= 6
          ? "The cooperative outcome is ready."
          : "Control returns to the human player.",
      details: [{ label: "Next round", value: Math.min(round + 1, 6) }],
    }),
  ];

  return {
    publicState: {
      ...publicState,
      round: Math.min(round + 1, 6),
      river: refilled.river,
      supply: refilled.supply,
      rivalDeck: remainingDeck,
      rivalProgress: publicState.rivalProgress + (claimed?.value ?? 0),
      eventLog: [...publicState.eventLog, ...events],
    },
    events,
    claimed,
    instruction,
  };
}

export function eventProcedureIds(events: readonly GameEvent[]): string[] {
  return events.map((event) => event.procedureId);
}
