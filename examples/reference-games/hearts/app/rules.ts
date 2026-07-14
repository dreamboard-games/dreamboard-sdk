import type { CardId, PlayerId } from "../shared/manifest-contract";
import type {
  GameErrorCode,
  GameState,
  HeartsOutcome,
  PublicState,
  Suit,
} from "./game-contract";
import type { TableQueriesOfState } from "@dreamboard-games/sdk/reducer";

const RANK_VALUE: Readonly<Record<string, number>> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

type CardPlayIssue = {
  readonly errorCode: Extract<
    GameErrorCode,
    | "NOT_YOUR_TURN"
    | "MUST_FOLLOW_SUIT"
    | "MUST_LEAD_TWO_OF_CLUBS"
    | "HEARTS_NOT_BROKEN"
    | "NO_PENALTIES_FIRST_TRICK"
  >;
  readonly message: string;
};

function cardProperties(q: TableQueriesOfState<GameState>, cardId: CardId) {
  const properties = q.card.get(cardId).properties;
  if (!properties.suit || !properties.rank) {
    throw new Error(`Hearts card ${cardId} is missing suit or rank metadata.`);
  }
  return { suit: properties.suit, rank: properties.rank };
}

export function isPenaltyCard(
  q: TableQueriesOfState<GameState>,
  cardId: CardId,
): boolean {
  const card = cardProperties(q, cardId);
  return (
    card.suit === "hearts" || (card.suit === "spades" && card.rank === "Q")
  );
}

export function validateCardPlay(options: {
  readonly state: GameState;
  readonly playerId: PlayerId;
  readonly cardId: CardId;
  readonly q: TableQueriesOfState<GameState>;
}): CardPlayIssue | null {
  const { state, playerId, cardId, q } = options;
  if (!state.flow.activePlayers.includes(playerId)) {
    return {
      errorCode: "NOT_YOUR_TURN",
      message: "Only the active player may play a card.",
    };
  }

  const phase = state.phase.get("playing");
  if (!phase) {
    return {
      errorCode: "NOT_YOUR_TURN",
      message: "Cards may only be played during trick play.",
    };
  }

  const hand = q.zone.playerCards(playerId, "hand") as readonly CardId[];
  const card = cardProperties(q, cardId);
  const isLead = phase.plays.length === 0;
  const isFirstTrick = state.publicState.tricksCompleted === 0;

  // Rule 1: the first card of the hand is always the 2 of Clubs.
  if (isFirstTrick && isLead && cardId !== "clubs-2") {
    return {
      errorCode: "MUST_LEAD_TWO_OF_CLUBS",
      message: "The 2 of Clubs must lead the first trick.",
    };
  }

  // Rule 2: following suit takes precedence over every discard rule.
  if (!isLead && phase.leadSuit) {
    const hasLeadSuit = hand.some(
      (heldCardId) => cardProperties(q, heldCardId).suit === phase.leadSuit,
    );
    if (hasLeadSuit && card.suit !== phase.leadSuit) {
      return {
        errorCode: "MUST_FOLLOW_SUIT",
        message: `You must follow ${phase.leadSuit}.`,
      };
    }
  }

  // Rule 3: a first-trick, off-suit player must discard a non-penalty card
  // unless every card left in their hand is a penalty card.
  if (isFirstTrick && !isLead && isPenaltyCard(q, cardId)) {
    const hasLeadSuit = hand.some(
      (heldCardId) => cardProperties(q, heldCardId).suit === phase.leadSuit,
    );
    const hasNonPenalty = hand.some(
      (heldCardId) => !isPenaltyCard(q, heldCardId),
    );
    if (!hasLeadSuit && hasNonPenalty) {
      return {
        errorCode: "NO_PENALTIES_FIRST_TRICK",
        message:
          "Discard a non-penalty card on the first trick when one is available.",
      };
    }
  }

  // Rule 4 permits any later off-suit discard. Rule 5 constrains only leads.
  if (isLead && card.suit === "hearts" && !state.publicState.heartsBroken) {
    const hasNonHeart = hand.some(
      (heldCardId) => cardProperties(q, heldCardId).suit !== "hearts",
    );
    if (hasNonHeart) {
      return {
        errorCode: "HEARTS_NOT_BROKEN",
        message: "Hearts cannot lead until broken unless only hearts remain.",
      };
    }
  }

  return null;
}

export function legalCardIds(options: {
  readonly state: GameState;
  readonly playerId: PlayerId;
  readonly q: TableQueriesOfState<GameState>;
}): readonly CardId[] {
  return (
    options.q.zone.playerCards(options.playerId, "hand") as readonly CardId[]
  ).filter((cardId) => validateCardPlay({ ...options, cardId }) === null);
}

export function trickWinner(options: {
  readonly leadSuit: Suit;
  readonly plays: readonly { playerId: PlayerId; cardId: CardId }[];
  readonly q: TableQueriesOfState<GameState>;
}): PlayerId {
  const eligible = options.plays.filter(
    ({ cardId }) => cardProperties(options.q, cardId).suit === options.leadSuit,
  );
  const winner = eligible.reduce((best, candidate) => {
    const bestRank =
      RANK_VALUE[cardProperties(options.q, best.cardId).rank] ?? 0;
    const candidateRank =
      RANK_VALUE[cardProperties(options.q, candidate.cardId).rank] ?? 0;
    return candidateRank > bestRank ? candidate : best;
  });
  return winner.playerId;
}

export function scoreCompletedHand(options: {
  readonly playerIds: readonly PlayerId[];
  readonly capturedHeartsByPlayer: PublicState["capturedHeartsByPlayer"];
  readonly queenOfSpadesCapturedBy: PlayerId | null;
}): {
  readonly pointsByPlayer: Record<PlayerId, number>;
  readonly moonShooter: PlayerId | null;
  readonly outcome: HeartsOutcome;
} {
  const rawPoints = Object.fromEntries(
    options.playerIds.map((playerId) => [
      playerId,
      (options.capturedHeartsByPlayer[playerId] ?? 0) +
        (options.queenOfSpadesCapturedBy === playerId ? 13 : 0),
    ]),
  ) as Record<PlayerId, number>;
  const moonShooter =
    options.playerIds.find((playerId) => rawPoints[playerId] === 26) ?? null;
  const pointsByPlayer = Object.fromEntries(
    options.playerIds.map((playerId) => [
      playerId,
      moonShooter ? (playerId === moonShooter ? 0 : 26) : rawPoints[playerId],
    ]),
  ) as Record<PlayerId, number>;

  const ordered = [...options.playerIds].sort(
    (left, right) => pointsByPlayer[left] - pointsByPlayer[right],
  );
  const lowest = pointsByPlayer[ordered[0]!];
  const lowestCount = ordered.filter(
    (playerId) => pointsByPlayer[playerId] === lowest,
  ).length;
  let previousScore: number | null = null;
  let previousRank = 0;
  const standings = ordered.map((playerId, index) => {
    const score = pointsByPlayer[playerId];
    const rank = score === previousScore ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;
    return {
      playerId,
      rank,
      result: rank === 1 ? (lowestCount === 1 ? "win" : "draw") : "loss",
      score,
    } as const;
  });

  return {
    pointsByPlayer,
    moonShooter,
    outcome: {
      reason: {
        code: "HAND_COMPLETE",
        message: "All thirteen tricks were completed and scored.",
      },
      standings,
    },
  };
}
