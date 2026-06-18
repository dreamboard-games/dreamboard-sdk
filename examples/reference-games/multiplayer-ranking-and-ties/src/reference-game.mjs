import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const guilds = ["food", "craft", "music"];
export const demoPlayers = ["player-1", "player-2", "player-3", "player-4"];
export const maxRounds = 6;

const cardRecipe = [
  { prestige: 1, coins: 1, count: 2 },
  { prestige: 2, coins: 0, count: 4 },
  { prestige: 2, coins: 1, count: 2 },
  { prestige: 3, coins: 0, count: 2 },
];

export const stallCards = guilds.flatMap((guild) =>
  cardRecipe.flatMap(({ prestige, coins, count }) =>
    Array.from({ length: count }, (_, index) => ({
      kind: "stall",
      id: `${guild}-p${prestige}-c${coins}-${index + 1}`,
      guild,
      prestige,
      coins,
    })),
  ),
);

export const stormCards = [
  { kind: "storm", id: "storm-1" },
  { kind: "storm", id: "storm-2" },
];

export const harborDeck = [...stallCards, ...stormCards];
export const cardById = Object.fromEntries(
  harborDeck.map((card) => [card.id, card]),
);

function assertPlayerCount(playerIds) {
  if (
    !Array.isArray(playerIds) ||
    playerIds.length < 2 ||
    playerIds.length > 4
  ) {
    throw new Error("Harbor Fair supports two to four players.");
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Harbor Fair player IDs must be unique.");
  }
}

function seededShuffle(cards, seed = "harbor-fair") {
  const items = [...cards];
  let state = 0;
  for (const char of seed) {
    state = (state * 31 + char.charCodeAt(0)) >>> 0;
  }
  for (let index = items.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items.map((card) => card.id);
}

function uniqueDeckOrder(cardIds) {
  const seen = new Set();
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

function refillMarket(state) {
  let deck = [...state.deck];
  let market = [...state.market];
  let stormsRevealed = state.stormsRevealed;
  const events = [];

  while (market.length < 4 && deck.length > 0) {
    const [nextCardId, ...remainingDeck] = deck;
    const card = cardById[nextCardId];
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
          phase: "complete",
          completed: true,
          terminal: createCancellationOutcome(state.playerIds),
        };
      }
      continue;
    }
    market.push(nextCardId);
  }

  return {
    ...state,
    deck,
    market,
    stormsRevealed,
    events: [...state.events, ...events],
  };
}

export function createInitialState({
  playerIds = demoPlayers,
  deckOrder,
  seed = "harbor-fair",
} = {}) {
  assertPlayerCount(playerIds);
  const baseState = {
    phase: "draft",
    round: 1,
    activePlayerIndex: 0,
    playerIds,
    market: [],
    deck: uniqueDeckOrder(deckOrder ?? seededShuffle(harborDeck, seed)),
    festivalRows: Object.fromEntries(
      playerIds.map((playerId) => [playerId, []]),
    ),
    stormsRevealed: 0,
    events: [],
    completed: false,
    terminal: null,
  };
  return refillMarket(baseState);
}

export function activePlayerId(state) {
  return state.playerIds[state.activePlayerIndex];
}

export function legalMarketCardIds(state) {
  if (state.phase !== "draft" || state.completed) {
    return [];
  }
  return state.market.filter((cardId) => cardById[cardId]?.kind === "stall");
}

export function validateDraft(
  state,
  { playerId = activePlayerId(state), cardId },
) {
  if (state.phase !== "draft" || state.completed) {
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
  state,
  { playerId = activePlayerId(state), cardId },
) {
  const validation = validateDraft(state, { playerId, cardId });
  if (!validation.ok) {
    return { accepted: false, state, validation };
  }

  const nextRows = {
    ...state.festivalRows,
    [playerId]: [...state.festivalRows[playerId], cardId],
  };
  const nextBase = refillMarket({
    ...state,
    market: state.market.filter((marketCardId) => marketCardId !== cardId),
    festivalRows: nextRows,
    events: [
      ...state.events,
      {
        kind: "stall-drafted",
        playerId,
        cardId,
        round: state.round,
      },
    ],
  });
  if (nextBase.completed) {
    return {
      accepted: true,
      state: nextBase,
      validation,
    };
  }

  const nextPlayerIndex = state.activePlayerIndex + 1;
  if (nextPlayerIndex < state.playerIds.length) {
    return {
      accepted: true,
      state: {
        ...nextBase,
        activePlayerIndex: nextPlayerIndex,
      },
      validation,
    };
  }

  if (state.round >= maxRounds) {
    const terminal = createRankedOutcome({
      playerIds: state.playerIds,
      festivalRows: nextRows,
    });
    return {
      accepted: true,
      state: {
        ...nextBase,
        phase: "complete",
        round: maxRounds,
        activePlayerIndex: 0,
        completed: true,
        terminal,
        events: [
          ...nextBase.events,
          { kind: "festival-scored", round: maxRounds },
        ],
      },
      validation,
    };
  }

  return {
    accepted: true,
    state: {
      ...nextBase,
      round: state.round + 1,
      activePlayerIndex: 0,
    },
    validation,
  };
}

export function scoreFestivalRow(cardIds) {
  const cards = cardIds.map((cardId) => cardById[cardId]);
  const guildCounts = Object.fromEntries(guilds.map((guild) => [guild, 0]));
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

export function totalScore(row) {
  return row.total ?? row.prestige + row.completeSets * 4 + row.coins;
}

export function compareFestivalResult(a, b) {
  return (
    totalScore(b) - totalScore(a) ||
    b.completeSets - a.completeSets ||
    b.coins - a.coins ||
    (a.seatIndex ?? 0) - (b.seatIndex ?? 0)
  );
}

function sameStandingGroup(a, b) {
  return (
    a.total === b.total &&
    a.completeSets === b.completeSets &&
    a.coins === b.coins
  );
}

export function createRankedOutcome({ playerIds, festivalRows }) {
  const scored = playerIds.map((playerId, seatIndex) => ({
    playerId,
    seatIndex,
    ...scoreFestivalRow(festivalRows[playerId] ?? []),
  }));
  const sorted = [...scored].sort(compareFestivalResult);
  const groupSizes = new Map();
  for (const row of sorted) {
    const key = `${row.total}:${row.completeSets}:${row.coins}`;
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
  }

  let previous = null;
  let rank = 0;
  return {
    reason: { code: "SIX_ROUNDS_COMPLETE" },
    standings: sorted.map((row, index) => {
      if (!previous || !sameStandingGroup(previous, row)) {
        rank = index + 1;
      }
      previous = row;
      const key = `${row.total}:${row.completeSets}:${row.coins}`;
      const tied = groupSizes.get(key) > 1;
      return {
        playerId: row.playerId,
        rank,
        result: rank === 1 ? (tied ? "draw" : "win") : "loss",
        score: row.total,
        scoreBreakdown: [
          {
            id: "stall-prestige",
            label: "Stall prestige",
            value: row.prestige,
          },
          { id: "guild-sets", label: "Guild sets", value: row.guildSetPoints },
          { id: "coin-bonus", label: "Coins", value: row.coins },
        ],
        tieBreaks: [
          {
            id: "complete-sets",
            label: "Complete sets",
            value: row.completeSets,
          },
          { id: "coins", label: "Coins", value: row.coins },
        ],
      };
    }),
  };
}

export function createCancellationOutcome(playerIds) {
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

export const scorelessCancellationOutcome = createCancellationOutcome;

export function validateOutcome(outcome, playerIds) {
  const expected = new Set(playerIds);
  const seen = new Set();
  if (!outcome.reason?.code) {
    throw new Error("missing reason code");
  }
  for (const standing of outcome.standings) {
    if (!expected.has(standing.playerId)) {
      throw new Error(`unknown player ${standing.playerId}`);
    }
    if (seen.has(standing.playerId)) {
      throw new Error(`duplicate player ${standing.playerId}`);
    }
    seen.add(standing.playerId);
    if (!Number.isInteger(standing.rank) || standing.rank < 1) {
      throw new Error(`invalid rank for ${standing.playerId}`);
    }
    if (!["win", "draw", "loss", "eliminated"].includes(standing.result)) {
      throw new Error(`invalid result for ${standing.playerId}`);
    }
    if (standing.score !== undefined && !Number.isFinite(standing.score)) {
      throw new Error(`invalid score for ${standing.playerId}`);
    }
  }
  for (const playerId of expected) {
    if (!seen.has(playerId)) {
      throw new Error(`missing player ${playerId}`);
    }
  }
  return true;
}

export function reconnectTerminalState(outcome) {
  return JSON.parse(JSON.stringify({ terminal: outcome })).terminal;
}

export function outcomeFromFestivalResults(results) {
  return createRankedOutcome({
    playerIds: results.map((row) => row.playerId),
    festivalRows: Object.fromEntries(
      results.map((row) => [row.playerId, row.cardIds]),
    ),
  });
}

export function deckForDraftSequence(sequence, extraCards = []) {
  const front = [...sequence.slice(0, 4), ...sequence.slice(4), ...extraCards];
  return uniqueDeckOrder(front);
}

export function playDraftSequence({ playerIds, sequence, deckOrder }) {
  let state = createInitialState({
    playerIds,
    deckOrder: deckOrder ?? deckForDraftSequence(sequence),
  });
  const results = [];
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

const uniqueWinnerSequence = [
  "food-p3-c0-1",
  "food-p2-c0-1",
  "craft-p2-c0-1",
  "food-p2-c0-2",
  "craft-p3-c0-1",
  "craft-p2-c0-2",
  "food-p2-c0-3",
  "food-p2-c0-4",
  "music-p3-c0-1",
  "music-p2-c0-1",
  "craft-p2-c0-3",
  "craft-p2-c0-4",
  "food-p2-c1-1",
  "craft-p1-c1-1",
  "music-p2-c0-2",
  "food-p1-c1-1",
  "craft-p2-c1-1",
  "music-p1-c1-1",
  "music-p2-c1-1",
  "craft-p1-c1-2",
  "music-p2-c1-2",
  "food-p1-c1-2",
  "craft-p3-c0-2",
  "music-p1-c1-2",
];

const trueTieSequence = [
  "food-p3-c0-1",
  "food-p3-c0-2",
  "craft-p2-c1-1",
  "craft-p2-c1-2",
  "music-p1-c1-1",
  "music-p1-c1-2",
  "food-p2-c0-1",
  "food-p2-c0-2",
  "craft-p2-c0-1",
  "craft-p2-c0-2",
  "music-p2-c0-1",
  "music-p2-c0-2",
];

const completeSetTieBreakSequence = [
  "food-p2-c0-1",
  "food-p3-c0-1",
  "food-p1-c1-1",
  "craft-p2-c0-1",
  "craft-p3-c0-1",
  "craft-p1-c1-1",
  "music-p2-c0-1",
  "music-p2-c0-2",
  "music-p1-c1-1",
  "food-p2-c0-2",
  "food-p2-c1-1",
  "food-p2-c0-3",
  "craft-p2-c0-2",
  "craft-p2-c1-1",
  "craft-p2-c0-3",
  "music-p2-c0-3",
  "food-p2-c1-2",
  "music-p2-c1-1",
];

const coinTieBreakSequence = [
  "food-p2-c1-1",
  "food-p3-c0-1",
  "food-p1-c1-1",
  "craft-p2-c1-1",
  "craft-p3-c0-1",
  "craft-p1-c1-1",
  "music-p2-c0-1",
  "music-p3-c0-1",
  "music-p1-c1-1",
  "food-p2-c0-1",
  "food-p2-c0-2",
  "food-p2-c0-3",
  "craft-p2-c0-1",
  "craft-p2-c0-2",
  "craft-p2-c0-3",
  "food-p2-c1-2",
  "food-p2-c0-4",
  "music-p2-c1-1",
];

const cancellationDeckOrder = uniqueDeckOrder([
  "food-p2-c0-1",
  "craft-p2-c0-1",
  "music-p2-c0-1",
  "food-p1-c1-1",
  "storm-1",
  "craft-p1-c1-1",
  "storm-2",
  "music-p1-c1-1",
]);

const nonFirstTieRows = {
  "player-1": ["food-p3-c0-1", "craft-p3-c0-1", "music-p3-c0-1"],
  "player-2": ["food-p2-c0-1", "craft-p2-c0-1", "music-p2-c1-1"],
  "player-3": ["food-p2-c0-2", "craft-p2-c0-2", "music-p2-c1-2"],
  "player-4": ["food-p1-c1-1", "craft-p1-c1-1"],
};

const nonFirstTieOutcome = createRankedOutcome({
  playerIds: demoPlayers,
  festivalRows: nonFirstTieRows,
});

const uniqueWinner = playDraftSequence({
  playerIds: demoPlayers,
  sequence: uniqueWinnerSequence,
});
const trueTie = playDraftSequence({
  playerIds: ["player-1", "player-2"],
  sequence: trueTieSequence,
});
const completeSetTieBreak = playDraftSequence({
  playerIds: ["player-1", "player-2", "player-3"],
  sequence: completeSetTieBreakSequence,
});
const coinTieBreak = playDraftSequence({
  playerIds: ["player-1", "player-2", "player-3"],
  sequence: coinTieBreakSequence,
});
const scorelessCancellation = playDraftSequence({
  playerIds: ["player-1", "player-2"],
  sequence: ["food-p2-c0-1", "craft-p2-c0-1"],
  deckOrder: cancellationDeckOrder,
});

export const scenarioResults = {
  uniqueWinner: demoPlayers.map((playerId) => ({
    playerId,
    cardIds: uniqueWinner.state.festivalRows[playerId],
  })),
  trueTie: ["player-1", "player-2"].map((playerId) => ({
    playerId,
    cardIds: trueTie.state.festivalRows[playerId],
  })),
  completeSetTieBreak: ["player-1", "player-2", "player-3"].map((playerId) => ({
    playerId,
    cardIds: completeSetTieBreak.state.festivalRows[playerId],
  })),
  coinTieBreak: ["player-1", "player-2", "player-3"].map((playerId) => ({
    playerId,
    cardIds: coinTieBreak.state.festivalRows[playerId],
  })),
  nonFirstTie: demoPlayers.map((playerId) => ({
    playerId,
    cardIds: nonFirstTieRows[playerId],
  })),
};

export const scenarioMetadata = {
  initial: {
    id: "multiplayer-ranking-and-ties.initial",
    state: createInitialState({
      playerIds: ["player-1", "player-2"],
      deckOrder: deckForDraftSequence(trueTieSequence),
    }),
  },
  uniqueWinner: {
    id: "multiplayer-ranking-and-ties.unique-winner",
    playerCount: 4,
    sequence: uniqueWinnerSequence,
    state: uniqueWinner.state,
    outcome: uniqueWinner.state.terminal,
  },
  trueTie: {
    id: "multiplayer-ranking-and-ties.true-tie",
    playerCount: 2,
    sequence: trueTieSequence,
    state: trueTie.state,
    outcome: trueTie.state.terminal,
  },
  completeSetTieBreak: {
    id: "multiplayer-ranking-and-ties.complete-set-tie-break",
    playerCount: 3,
    sequence: completeSetTieBreakSequence,
    state: completeSetTieBreak.state,
    outcome: completeSetTieBreak.state.terminal,
  },
  coinTieBreak: {
    id: "multiplayer-ranking-and-ties.coin-tie-break",
    playerCount: 3,
    sequence: coinTieBreakSequence,
    state: coinTieBreak.state,
    outcome: coinTieBreak.state.terminal,
  },
  nonFirstTie: {
    id: "multiplayer-ranking-and-ties.non-first-tie",
    playerCount: 4,
    rows: nonFirstTieRows,
    outcome: nonFirstTieOutcome,
  },
  scorelessCancellation: {
    id: "multiplayer-ranking-and-ties.scoreless-cancellation",
    playerCount: 2,
    deckOrder: cancellationDeckOrder,
    state: scorelessCancellation.state,
    outcome: scorelessCancellation.state.terminal,
  },
};

export const referenceGame = {
  id: "multiplayer-ranking-and-ties",
  displayName: "Multiplayer Ranking And Ties",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  rulesBrief: "Harbor Fair",
  players: { min: 2, max: 4 },
  loop: {
    rounds: maxRounds,
    marketSize: 4,
    resolution: "seat-order-drafting",
    stormLimit: 2,
  },
  guidance: {
    phase: {
      id: "draft",
      label: "Draft a stall",
      summary: "Choose one face-up stall card from the shared harbor market.",
      objective:
        "Build high-prestige guild sets before six rounds end or the second storm cancels the fair.",
    },
    setup: {
      profileId: "standard",
      name: "Standard Harbor Fair",
      summary:
        "Shuffle the stall and storm deck, then reveal four stall cards to the market.",
      steps: [
        {
          id: "seat-players",
          label: "Seat players",
          description: "Use two to four unique player seats.",
        },
        {
          id: "reveal-market",
          label: "Reveal the market",
          description:
            "Fill the market with four face-up stall cards, resolving storms as setup events.",
        },
      ],
    },
  },
  deck: {
    guilds,
    stallCards,
    stormCards,
    seededDeckSize: harborDeck.length,
  },
  rules: {
    summary:
      "Players draft one public stall card in seat order for six rounds unless the second storm cancels the fair.",
    scoring: {
      stallPrestige: "sum printed prestige",
      guildSets: "4 points for each complete food craft music set",
      coinBonus: "1 point per coin",
      tieBreaks: ["complete-sets", "coins"],
    },
    cancellation:
      "Storm cards revealed during market refill do not enter the market. The second storm ends the game with a scoreless draw.",
  },
  interactions: [
    {
      id: "draft-stall",
      label: "Draft stall",
      help: "Choose one face-up stall card. Final ties break by complete guild sets, then coins.",
      input: "card",
      collector: "market.card",
      rule: "choose one face-up stall card from the shared harbor market",
    },
  ],
  scenarios: scenarioMetadata,
  scoring: [
    "sum printed stall prestige",
    "4 points for each complete food craft music set",
    "1 point per coin",
    "ties break first by complete sets then by coins",
  ],
  proofCommands: [
    "node examples/reference-games/multiplayer-ranking-and-ties/scenarios/verify.mjs",
    "pnpm --dir examples/reference-games/multiplayer-ranking-and-ties test",
  ],
  coverage,
};

if (
  typeof process !== "undefined" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      cards: harborDeck.length,
      interactions: referenceGame.interactions.length,
      scenarios: Object.keys(referenceGame.scenarios),
    }),
  );
}
