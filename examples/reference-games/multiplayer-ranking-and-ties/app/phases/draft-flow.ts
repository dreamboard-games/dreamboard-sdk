import type { CardId, PlayerId } from "../../shared/manifest-contract";
import type {
  HarborOutcome,
  HarborPublicState,
  HarborStanding,
  ScoreComponent,
} from "../game-contract";

export const guilds = ["food", "craft", "music"] as const;
export const demoPlayers = [
  "player-1",
  "player-2",
  "player-3",
  "player-4",
] as const;
export const maxRounds = 6;

type Guild = (typeof guilds)[number];

export type StallCard = {
  kind: "stall";
  id: CardId;
  guild: Guild;
  prestige: number;
  coins: number;
};

export type StormCard = {
  kind: "storm";
  id: CardId;
};

export type HarborCard = StallCard | StormCard;

const cardRecipe = [
  { prestige: 1, coins: 1, count: 2 },
  { prestige: 2, coins: 0, count: 4 },
  { prestige: 2, coins: 1, count: 2 },
  { prestige: 3, coins: 0, count: 2 },
] as const;

export const stallCards = guilds.flatMap((guild) =>
  cardRecipe.flatMap(({ prestige, coins, count }) =>
    Array.from({ length: count }, (_, index) => ({
      kind: "stall" as const,
      id: `${guild}-p${prestige}-c${coins}-${index + 1}` as CardId,
      guild,
      prestige,
      coins,
    })),
  ),
);

export const stormCards = [
  { kind: "storm" as const, id: "storm-1" as CardId },
  { kind: "storm" as const, id: "storm-2" as CardId },
];

export const harborDeck = [...stallCards, ...stormCards] as const;
export const cardById = Object.fromEntries(
  harborDeck.map((card) => [card.id, card]),
) as Record<CardId, HarborCard>;

export type DraftValidation =
  | { ok: true; legalCardIds: CardId[] }
  | {
      ok: false;
      errorCode:
        | "CARD_NOT_AVAILABLE"
        | "PHASE_NOT_DRAFTING"
        | "PLAYER_NOT_ACTIVE"
        | "UNKNOWN_CARD";
      message: string;
      legalCardIds?: CardId[];
    };

function assertPlayerCount(playerIds: readonly PlayerId[]) {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("Harbor Fair supports two to four players.");
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Harbor Fair player IDs must be unique.");
  }
}

function seededShuffle(cards: readonly HarborCard[], seed = "harbor-fair") {
  const items = [...cards];
  let state = 0;
  for (const char of seed) {
    state = (state * 31 + char.charCodeAt(0)) >>> 0;
  }
  for (let index = items.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }
  return items.map((card) => card.id);
}

export function uniqueDeckOrder(cardIds: readonly CardId[]) {
  const seen = new Set<CardId>();
  for (const cardId of cardIds) {
    if (!cardById[cardId]) {
      throw new Error(`Unknown Harbor Fair card ${cardId}`);
    }
    if (seen.has(cardId)) {
      throw new Error(`Duplicate Harbor Fair card ${cardId}`);
    }
    seen.add(cardId);
  }
  return [
    ...cardIds,
    ...harborDeck.map((card) => card.id).filter((cardId) => !seen.has(cardId)),
  ];
}

export function activePlayerId(state: HarborPublicState) {
  return state.playerIds[state.activePlayerIndex]!;
}

export function refillMarket(state: HarborPublicState): HarborPublicState {
  let deck = [...state.deck];
  const market = [...state.market];
  let stormsRevealed = state.stormsRevealed;
  const events: HarborPublicState["events"] = [];

  while (market.length < 4 && deck.length > 0) {
    const [nextCardId, ...remainingDeck] = deck;
    const card = cardById[nextCardId!];
    deck = remainingDeck;
    if (card.kind === "storm") {
      stormsRevealed += 1;
      events.push({
        kind: "storm-revealed",
        stormId: card.id,
        stormsRevealed,
      });
      if (stormsRevealed >= 2) {
        return {
          ...state,
          deck,
          market,
          stormsRevealed,
          events: [...state.events, ...events],
          completed: true,
          outcome: createCancellationOutcome(state.playerIds),
        };
      }
      continue;
    }
    market.push(nextCardId!);
  }

  return {
    ...state,
    deck,
    market,
    stormsRevealed,
    events: [...state.events, ...events],
  };
}

export function createInitialPublicState({
  playerIds = demoPlayers as unknown as readonly PlayerId[],
  deckOrder,
  seed = "harbor-fair",
}: {
  playerIds?: readonly PlayerId[];
  deckOrder?: readonly CardId[];
  seed?: string;
} = {}): HarborPublicState {
  assertPlayerCount(playerIds);
  const festivalRows = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as CardId[]]),
  ) as HarborPublicState["festivalRows"];
  return refillMarket({
    round: 1,
    activePlayerIndex: 0,
    playerIds: [...playerIds],
    market: [],
    deck: uniqueDeckOrder(deckOrder ?? seededShuffle(harborDeck, seed)),
    festivalRows,
    stormsRevealed: 0,
    events: [],
    completed: false,
    outcome: null,
  });
}

export function legalMarketCardIds(state: HarborPublicState) {
  if (state.completed) {
    return [];
  }
  return state.market.filter((cardId) => cardById[cardId]?.kind === "stall");
}

export function validateDraft(
  state: HarborPublicState,
  {
    playerId = activePlayerId(state),
    cardId,
  }: { playerId?: PlayerId; cardId: CardId },
): DraftValidation {
  if (state.completed) {
    return {
      ok: false,
      errorCode: "PHASE_NOT_DRAFTING",
      message: "Stall cards can only be drafted before the festival ends.",
    };
  }
  if (playerId !== activePlayerId(state)) {
    return {
      ok: false,
      errorCode: "PLAYER_NOT_ACTIVE",
      message: "Players draft from the market in seat order.",
    };
  }
  if (!cardById[cardId]) {
    return {
      ok: false,
      errorCode: "UNKNOWN_CARD",
      message: "The selected market card does not exist.",
    };
  }
  if (!state.market.includes(cardId) || cardById[cardId].kind !== "stall") {
    return {
      ok: false,
      errorCode: "CARD_NOT_AVAILABLE",
      message: "Choose one face-up stall card from the market.",
      legalCardIds: legalMarketCardIds(state),
    };
  }
  return { ok: true, legalCardIds: legalMarketCardIds(state) };
}

export function draftStall(
  state: HarborPublicState,
  {
    playerId = activePlayerId(state),
    cardId,
  }: { playerId?: PlayerId; cardId: CardId },
) {
  const validation = validateDraft(state, { playerId, cardId });
  if (!validation.ok) {
    return { accepted: false as const, state, validation };
  }

  const nextRows = {
    ...state.festivalRows,
    [playerId]: [...(state.festivalRows[playerId] ?? []), cardId],
  };
  const nextBase = refillMarket({
    ...state,
    market: state.market.filter((marketCardId) => marketCardId !== cardId),
    festivalRows: nextRows,
    events: [
      ...state.events,
      {
        kind: "stall-drafted" as const,
        playerId,
        cardId,
        round: state.round,
      },
    ],
  });
  if (nextBase.completed) {
    return {
      accepted: true as const,
      state: nextBase,
      validation,
    };
  }

  const nextPlayerIndex = state.activePlayerIndex + 1;
  if (nextPlayerIndex < state.playerIds.length) {
    return {
      accepted: true as const,
      state: {
        ...nextBase,
        activePlayerIndex: nextPlayerIndex,
      },
      validation,
    };
  }

  if (state.round >= maxRounds) {
    const outcome = createRankedOutcome({
      playerIds: state.playerIds,
      festivalRows: nextRows,
    });
    return {
      accepted: true as const,
      state: {
        ...nextBase,
        round: maxRounds,
        activePlayerIndex: 0,
        completed: true,
        outcome,
        events: [
          ...nextBase.events,
          { kind: "festival-scored" as const, round: maxRounds },
        ],
      },
      validation,
    };
  }

  return {
    accepted: true as const,
    state: {
      ...nextBase,
      round: state.round + 1,
      activePlayerIndex: 0,
    },
    validation,
  };
}

export function scoreFestivalRow(cardIds: readonly CardId[]) {
  const cards = cardIds.map((cardId) => cardById[cardId]);
  const guildCounts = Object.fromEntries(
    guilds.map((guild) => [guild, 0]),
  ) as Record<Guild, number>;
  let prestige = 0;
  let coins = 0;
  for (const card of cards) {
    if (card?.kind !== "stall") {
      throw new Error(`Cannot score non-stall Harbor Fair card ${card?.id}`);
    }
    guildCounts[card.guild] += 1;
    prestige += card.prestige;
    coins += card.coins;
  }
  const completeSets = Math.min(...guilds.map((guild) => guildCounts[guild]));
  const guildSetPoints = completeSets * 4;
  return {
    prestige,
    guildSetPoints,
    coins,
    completeSets,
    total: prestige + guildSetPoints + coins,
    guildCounts,
  };
}

function totalScore(row: { total: number }) {
  return row.total;
}

function compareFestivalResult(
  a: ReturnType<typeof scoreFestivalRow> & { seatIndex: number },
  b: ReturnType<typeof scoreFestivalRow> & { seatIndex: number },
) {
  return (
    totalScore(b) - totalScore(a) ||
    b.completeSets - a.completeSets ||
    b.coins - a.coins ||
    a.seatIndex - b.seatIndex
  );
}

function sameStandingGroup(
  a: ReturnType<typeof scoreFestivalRow>,
  b: ReturnType<typeof scoreFestivalRow>,
) {
  return (
    a.total === b.total &&
    a.completeSets === b.completeSets &&
    a.coins === b.coins
  );
}

function scoreComponent(
  id: ScoreComponent["id"],
  label: string,
  value: number,
): ScoreComponent {
  return { id, label, value };
}

export function createRankedOutcome({
  playerIds,
  festivalRows,
}: {
  playerIds: readonly PlayerId[];
  festivalRows: HarborPublicState["festivalRows"];
}): HarborOutcome {
  const scored = playerIds.map((playerId, seatIndex) => ({
    playerId,
    seatIndex,
    ...scoreFestivalRow(festivalRows[playerId] ?? []),
  }));
  const sorted = [...scored].sort(compareFestivalResult);
  const groupSizes = new Map<string, number>();
  for (const row of sorted) {
    const key = `${row.total}:${row.completeSets}:${row.coins}`;
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
  }

  let previous: (typeof sorted)[number] | null = null;
  let rank = 0;
  return {
    reason: { code: "SIX_ROUNDS_COMPLETE" },
    standings: sorted.map((row, index): HarborStanding => {
      if (!previous || !sameStandingGroup(previous, row)) {
        rank = index + 1;
      }
      previous = row;
      const key = `${row.total}:${row.completeSets}:${row.coins}`;
      const tied = (groupSizes.get(key) ?? 0) > 1;
      return {
        playerId: row.playerId,
        rank,
        result: rank === 1 ? (tied ? "draw" : "win") : "loss",
        score: row.total,
        scoreBreakdown: [
          scoreComponent("stall-prestige", "Stall prestige", row.prestige),
          scoreComponent("guild-sets", "Guild sets", row.guildSetPoints),
          scoreComponent("coin-bonus", "Coins", row.coins),
        ],
        tieBreaks: [
          scoreComponent("complete-sets", "Complete sets", row.completeSets),
          scoreComponent("coins", "Coins", row.coins),
        ],
      };
    }),
  };
}

export function createCancellationOutcome(
  playerIds: readonly PlayerId[],
): HarborOutcome {
  return {
    reason: {
      code: "FESTIVAL_CANCELLED",
      message: "A second storm cancelled the harbor fair before scoring.",
    },
    standings: playerIds.map((playerId) => ({
      playerId,
      rank: 1,
      result: "draw",
    })),
  };
}

export function deckForDraftSequence(
  sequence: readonly CardId[],
  extraCards: readonly CardId[] = [],
) {
  return uniqueDeckOrder([
    ...sequence.slice(0, 4),
    ...sequence.slice(4),
    ...extraCards,
  ]);
}

export function playDraftSequence({
  playerIds,
  sequence,
  deckOrder,
}: {
  playerIds: readonly PlayerId[];
  sequence: readonly CardId[];
  deckOrder?: readonly CardId[];
}) {
  let state = createInitialPublicState({
    playerIds,
    deckOrder: deckOrder ?? deckForDraftSequence(sequence),
  });
  const results: ReturnType<typeof draftStall>[] = [];
  for (const cardId of sequence) {
    const result = draftStall(state, {
      playerId: activePlayerId(state),
      cardId,
    });
    results.push(result);
    if (!result.accepted) {
      throw new Error(result.validation.errorCode);
    }
    state = result.state;
    if (state.completed) {
      break;
    }
  }
  return { state, results };
}
