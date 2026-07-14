import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import { cardById } from "./cards";
import type {
  CardId,
  Guild,
  HarborHiddenState,
  HarborOutcome,
  HarborPublicState,
  HarborStanding,
  PlayerId,
  PublicEvent,
  ScoreComponent,
  StormId,
  TieBreak,
} from "./game-contract";

export const guilds = [
  "food",
  "craft",
  "music",
] as const satisfies readonly Guild[];
export const MAX_ROUNDS = 6;
export const MARKET_SIZE = 4;

export function assertPlayerCount(playerIds: readonly PlayerId[]): void {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("Harbor Fair supports two to four human players.");
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Harbor Fair player IDs must be unique.");
  }
}

export function createInitialPublicState(
  playerIds: readonly PlayerId[],
): HarborPublicState {
  assertPlayerCount(playerIds);
  return {
    round: 1,
    activePlayerIndex: 0,
    playerIds: [...playerIds],
    market: Array.from({ length: MARKET_SIZE }, () => null),
    festivalRows: Object.fromEntries(
      playerIds.map((playerId) => [playerId, []]),
    ),
    stormsRevealed: 0,
    stormHistory: [],
    events: [],
    completed: false,
    outcome: null,
  };
}

export function createInitialHiddenState(): HarborHiddenState {
  return { festivalDeck: [] };
}

export function activePlayerId(state: HarborPublicState): PlayerId {
  const playerId = state.playerIds[state.activePlayerIndex];
  if (!playerId) throw new Error("Harbor Fair active seat is out of range.");
  return playerId;
}

export function legalMarketCardIds(state: HarborPublicState): CardId[] {
  if (state.completed) return [];
  return state.market.filter((cardId): cardId is CardId => cardId !== null);
}

export type RefillMove = {
  readonly cardId: CardId;
  readonly destination: "market" | "storm-discard";
  readonly marketIndex: number;
};

export type RefillResult = {
  readonly publicState: HarborPublicState;
  readonly hiddenState: HarborHiddenState;
  readonly moves: readonly RefillMove[];
  readonly procedureEvents: readonly PublicEvent[];
};

export function createCancellationOutcome(
  playerIds: readonly PlayerId[],
): HarborOutcome {
  const outcome: HarborOutcome = {
    reason: {
      code: "FESTIVAL_CANCELLED",
      message: "A second storm cancelled the harbor fair before judging.",
    },
    standings: playerIds.map((playerId) => ({
      playerId,
      rank: 1,
      result: "draw",
    })),
  };
  assertOutcomePlayerCoverage(outcome, playerIds);
  return outcome;
}

export function refillMarketPositions(options: {
  readonly publicState: HarborPublicState;
  readonly hiddenState: HarborHiddenState;
  readonly marketIndices: readonly number[];
}): RefillResult {
  let deck = [...options.hiddenState.festivalDeck];
  const market = [...options.publicState.market];
  const stormHistory = [...options.publicState.stormHistory];
  let stormsRevealed = options.publicState.stormsRevealed;
  const moves: RefillMove[] = [];
  const procedureEvents: PublicEvent[] = [];

  for (const marketIndex of options.marketIndices) {
    if (
      !Number.isInteger(marketIndex) ||
      marketIndex < 0 ||
      marketIndex >= MARKET_SIZE
    ) {
      throw new Error(`Invalid Harbor Fair market index ${marketIndex}.`);
    }
    if (market[marketIndex] !== null) continue;

    while (market[marketIndex] === null) {
      const [cardId, ...remainingDeck] = deck;
      if (!cardId) {
        throw new Error("Harbor Fair festival deck exhausted during refill.");
      }
      deck = remainingDeck;
      const card = cardById[cardId];
      if (card.kind === "storm") {
        stormsRevealed += 1;
        stormHistory.push(card.id);
        moves.push({
          cardId,
          destination: "storm-discard",
          marketIndex,
        });
        procedureEvents.push({
          kind: "storm-revealed",
          stormId: card.id,
          stormsRevealed,
        });
        if (stormsRevealed === 2) {
          const outcome = createCancellationOutcome(
            options.publicState.playerIds,
          );
          return {
            moves,
            procedureEvents,
            hiddenState: { festivalDeck: deck },
            publicState: {
              ...options.publicState,
              market,
              stormsRevealed,
              stormHistory,
              events: [...options.publicState.events, ...procedureEvents],
              completed: true,
              outcome,
            },
          };
        }
        continue;
      }

      market[marketIndex] = cardId;
      moves.push({ cardId, destination: "market", marketIndex });
      procedureEvents.push({
        kind: "market-refilled",
        cardId,
        marketIndex,
      });
    }
  }

  return {
    moves,
    procedureEvents,
    hiddenState: { festivalDeck: deck },
    publicState: {
      ...options.publicState,
      market,
      stormsRevealed,
      stormHistory,
      events: [...options.publicState.events, ...procedureEvents],
    },
  };
}

export type DraftRejection = {
  readonly accepted: false;
  readonly errorCode:
    | "CARD_NOT_AVAILABLE"
    | "PHASE_NOT_DRAFTING"
    | "PLAYER_NOT_ACTIVE"
    | "UNKNOWN_CARD";
  readonly message: string;
};

export type DraftAcceptance = {
  readonly accepted: true;
  readonly publicState: HarborPublicState;
  readonly hiddenState: HarborHiddenState;
  readonly draftedCardId: CardId;
  readonly refillMoves: readonly RefillMove[];
  readonly procedureEvents: readonly PublicEvent[];
};

export function draftStall(options: {
  readonly publicState: HarborPublicState;
  readonly hiddenState: HarborHiddenState;
  readonly playerId: PlayerId;
  readonly stallId: CardId;
}): DraftRejection | DraftAcceptance {
  const { publicState, hiddenState, playerId, stallId } = options;
  if (publicState.completed) {
    return {
      accepted: false,
      errorCode: "PHASE_NOT_DRAFTING",
      message: "Stalls can only be drafted before the fair ends.",
    };
  }
  if (playerId !== activePlayerId(publicState)) {
    return {
      accepted: false,
      errorCode: "PLAYER_NOT_ACTIVE",
      message: "Players draft in fixed session seat order.",
    };
  }
  const card = cardById[stallId];
  if (!card) {
    return {
      accepted: false,
      errorCode: "UNKNOWN_CARD",
      message: "The selected card is not a Harbor Fair card.",
    };
  }
  const marketIndex = publicState.market.indexOf(stallId);
  if (card.kind !== "stall" || marketIndex < 0) {
    return {
      accepted: false,
      errorCode: "CARD_NOT_AVAILABLE",
      message: "Choose a face-up stall currently in the market.",
    };
  }

  const market = [...publicState.market];
  market[marketIndex] = null;
  const rows = {
    ...publicState.festivalRows,
    [playerId]: [...(publicState.festivalRows[playerId] ?? []), stallId],
  };
  const drafted: PublicEvent = {
    kind: "stall-drafted",
    playerId,
    cardId: stallId,
    round: publicState.round,
  };
  const refill = refillMarketPositions({
    publicState: {
      ...publicState,
      market,
      festivalRows: rows,
      events: [...publicState.events, drafted],
    },
    hiddenState,
    marketIndices: [marketIndex],
  });

  if (refill.publicState.completed) {
    return {
      accepted: true,
      publicState: refill.publicState,
      hiddenState: refill.hiddenState,
      draftedCardId: stallId,
      refillMoves: refill.moves,
      procedureEvents: refill.procedureEvents,
    };
  }

  const nextPlayerIndex = publicState.activePlayerIndex + 1;
  if (nextPlayerIndex < publicState.playerIds.length) {
    return {
      accepted: true,
      publicState: {
        ...refill.publicState,
        activePlayerIndex: nextPlayerIndex,
      },
      hiddenState: refill.hiddenState,
      draftedCardId: stallId,
      refillMoves: refill.moves,
      procedureEvents: refill.procedureEvents,
    };
  }

  if (publicState.round === MAX_ROUNDS) {
    const outcome = createRankedOutcome({
      playerIds: publicState.playerIds,
      festivalRows: rows,
    });
    const scored: PublicEvent = { kind: "festival-scored", round: 6 };
    return {
      accepted: true,
      publicState: {
        ...refill.publicState,
        activePlayerIndex: 0,
        events: [...refill.publicState.events, scored],
        completed: true,
        outcome,
      },
      hiddenState: refill.hiddenState,
      draftedCardId: stallId,
      refillMoves: refill.moves,
      procedureEvents: [...refill.procedureEvents, scored],
    };
  }

  const nextRound = publicState.round + 1;
  const advanced: PublicEvent = {
    kind: "round-advanced",
    previousRound: publicState.round,
    nextRound,
  };
  return {
    accepted: true,
    publicState: {
      ...refill.publicState,
      round: nextRound,
      activePlayerIndex: 0,
      events: [...refill.publicState.events, advanced],
    },
    hiddenState: refill.hiddenState,
    draftedCardId: stallId,
    refillMoves: refill.moves,
    procedureEvents: [...refill.procedureEvents, advanced],
  };
}

export type FestivalScore = {
  readonly prestige: number;
  readonly guildSetPoints: number;
  readonly coins: number;
  readonly completeGuildSets: number;
  readonly total: number;
  readonly guildCounts: Readonly<Record<Guild, number>>;
};

export function scoreFestivalRow(cardIds: readonly CardId[]): FestivalScore {
  const guildCounts = Object.fromEntries(
    guilds.map((guild) => [guild, 0]),
  ) as Record<Guild, number>;
  let prestige = 0;
  let coins = 0;
  for (const cardId of cardIds) {
    const card = cardById[cardId];
    if (!card || card.kind !== "stall") {
      throw new Error(`Cannot score non-stall Harbor Fair card '${cardId}'.`);
    }
    guildCounts[card.guild] += 1;
    prestige += card.prestige;
    coins += card.coins;
  }
  const completeGuildSets = Math.min(
    ...guilds.map((guild) => guildCounts[guild]),
  );
  const guildSetPoints = completeGuildSets * 4;
  return {
    prestige,
    guildSetPoints,
    coins,
    completeGuildSets,
    total: prestige + guildSetPoints + coins,
    guildCounts,
  };
}

function scoreComponent(
  id: ScoreComponent["id"],
  label: string,
  value: number,
): ScoreComponent {
  return { id, label, value };
}

function tieBreak(id: TieBreak["id"], label: string, value: number): TieBreak {
  return { id, label, value };
}

export function assertOutcomePlayerCoverage(
  outcome: GameOutcome<PlayerId>,
  playerIds: readonly PlayerId[],
): void {
  const expected = new Set(playerIds);
  const seen = new Set<PlayerId>();
  for (const standing of outcome.standings) {
    if (!expected.has(standing.playerId)) {
      throw new Error(
        `Harbor Fair outcome contains unknown player '${standing.playerId}'.`,
      );
    }
    if (seen.has(standing.playerId)) {
      throw new Error(
        `Harbor Fair outcome contains duplicate player '${standing.playerId}'.`,
      );
    }
    seen.add(standing.playerId);
  }
  for (const playerId of playerIds) {
    if (!seen.has(playerId)) {
      throw new Error(`Harbor Fair outcome is missing player '${playerId}'.`);
    }
  }
}

export function createRankedOutcome(options: {
  readonly playerIds: readonly PlayerId[];
  readonly festivalRows: HarborPublicState["festivalRows"];
}): HarborOutcome {
  const scored = options.playerIds.map((playerId, seatIndex) => ({
    playerId,
    seatIndex,
    ...scoreFestivalRow(options.festivalRows[playerId] ?? []),
  }));
  const sorted = [...scored].sort(
    (left, right) =>
      right.total - left.total ||
      right.completeGuildSets - left.completeGuildSets ||
      right.coins - left.coins ||
      left.seatIndex - right.seatIndex,
  );
  let previous: (typeof sorted)[number] | null = null;
  let rank = 0;
  const standings = sorted.map((row, index): HarborStanding => {
    const sameGroup =
      previous !== null &&
      previous.total === row.total &&
      previous.completeGuildSets === row.completeGuildSets &&
      previous.coins === row.coins;
    if (!sameGroup) rank = index + 1;
    previous = row;
    const firstPlaceTie =
      rank === 1 &&
      sorted.filter(
        (candidate) =>
          candidate.total === row.total &&
          candidate.completeGuildSets === row.completeGuildSets &&
          candidate.coins === row.coins,
      ).length > 1;
    return {
      playerId: row.playerId,
      rank,
      result: rank === 1 ? (firstPlaceTie ? "draw" : "win") : "loss",
      score: row.total,
      scoreBreakdown: [
        scoreComponent("stall-prestige", "Stall prestige", row.prestige),
        scoreComponent(
          "guild-set-points",
          "Guild set points",
          row.guildSetPoints,
        ),
        scoreComponent("coin-bonus", "Coin bonus", row.coins),
      ],
      tieBreaks: [
        tieBreak(
          "complete-guild-sets",
          "Complete guild sets",
          row.completeGuildSets,
        ),
        tieBreak("coins", "Coins", row.coins),
      ],
    };
  });
  const outcome: HarborOutcome = {
    reason: {
      code: "SIX_ROUNDS_COMPLETE",
      message: "Six rounds are complete and the harbor festivals are judged.",
    },
    standings,
  };
  assertOutcomePlayerCoverage(outcome, options.playerIds);
  return outcome;
}
