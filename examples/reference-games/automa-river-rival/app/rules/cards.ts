import type {
  CardType,
  RivalInstructionsCardId,
  RiverCargoCardId,
} from "../../shared/manifest-contract";
import type { CargoKind, GameState, InstructionKind } from "../game-contract";
import { createStateQueries } from "../reducer-support";

type Q = ReturnType<typeof createStateQueries<GameState>>;

export type CargoCard = {
  readonly id: RiverCargoCardId;
  readonly cardType: CardType;
  readonly name: string;
  readonly cargoKind: CargoKind;
  readonly value: number;
};

export type RivalInstruction = {
  readonly id: RivalInstructionsCardId;
  readonly cardType: CardType;
  readonly name: string;
  readonly instructionKind: InstructionKind;
  readonly cargoKind?: CargoKind;
};

export function cargoCard(q: Q, cardId: RiverCargoCardId): CargoCard {
  const card = q.card.get(cardId);
  const properties = card.properties as {
    readonly cargoKind?: unknown;
    readonly value?: unknown;
  };
  if (
    !["timber", "grain", "ore"].includes(String(properties.cargoKind)) ||
    typeof properties.value !== "number"
  ) {
    throw new Error(`Card '${cardId}' is not River Guild cargo.`);
  }
  return {
    id: cardId,
    cardType: card.cardType,
    name: card.name ?? cardId,
    cargoKind: properties.cargoKind as CargoKind,
    value: properties.value,
  };
}

export function rivalInstruction(
  q: Q,
  cardId: RivalInstructionsCardId,
): RivalInstruction {
  const card = q.card.get(cardId);
  const properties = card.properties as {
    readonly instructionKind?: unknown;
    readonly cargoKind?: unknown;
  };
  if (
    !["claimHighest", "claimKind", "sweepLeft"].includes(
      String(properties.instructionKind),
    )
  ) {
    throw new Error(`Card '${cardId}' is not a rival instruction.`);
  }
  const instructionKind = properties.instructionKind as InstructionKind;
  if (
    instructionKind === "claimKind" &&
    !["timber", "grain", "ore"].includes(String(properties.cargoKind))
  ) {
    throw new Error(`Claim-kind instruction '${cardId}' has no cargo kind.`);
  }
  return {
    id: cardId,
    cardType: card.cardType,
    name: card.name ?? cardId,
    instructionKind,
    ...(instructionKind === "claimKind"
      ? { cargoKind: properties.cargoKind as CargoKind }
      : {}),
  };
}

export function chooseRivalCargoIndex(
  river: readonly CargoCard[],
  instruction: RivalInstruction,
): number {
  if (river.length === 0) {
    throw new Error("River Guild cannot resolve an empty river.");
  }
  if (instruction.instructionKind === "sweepLeft") return 0;

  const eligibleIndices = river.flatMap((card, index) =>
    instruction.instructionKind !== "claimKind" ||
    card.cargoKind === instruction.cargoKind
      ? [index]
      : [],
  );
  if (eligibleIndices.length === 0) return 0;

  let chosen = eligibleIndices[0]!;
  for (const index of eligibleIndices.slice(1)) {
    if (river[index]!.value > river[chosen]!.value) chosen = index;
  }
  return chosen;
}

export function withRiverOrder(
  state: GameState,
  orderedCardIds: readonly RiverCargoCardId[],
): GameState {
  return {
    ...state,
    table: {
      ...state.table,
      zones: {
        ...state.table.zones,
        shared: {
          ...state.table.zones.shared,
          river: [...orderedCardIds],
        },
      },
      decks: {
        ...state.table.decks,
        river: [...orderedCardIds],
      },
      componentLocations: {
        ...state.table.componentLocations,
        ...Object.fromEntries(
          orderedCardIds.map((cardId, position) => [
            cardId,
            {
              type: "InDeck" as const,
              deckId: "river",
              playedBy: null,
              position,
            },
          ]),
        ),
      },
    },
  };
}
